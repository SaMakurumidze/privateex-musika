import { type NextRequest, NextResponse } from "next/server"
import { createSQLClient } from "@/lib/db"
import { assertEmail } from "@/lib/input-safety"
import {
  BETA_EMAIL_NOT_CONFIGURED_MESSAGE,
  isEmailServiceConfigured,
  sendTransactionalEmail,
} from "@/lib/mailer"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail } = await request.json()
    const email = assertEmail(rawEmail)

    if (!isEmailServiceConfigured()) {
      return NextResponse.json({ error: BETA_EMAIL_NOT_CONFIGURED_MESSAGE }, { status: 503 })
    }

    const sql = createSQLClient()

    // Check if email exists
    const users = await sql`
      SELECT id, full_name FROM investors WHERE LOWER(email) = LOWER(${email})
    `

    // Return generic response even for unknown addresses to avoid account enumeration.
    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: "If an account exists for this email, password reset instructions have been sent.",
      })
    }

    const user = users[0]
    const rawToken = crypto.randomBytes(32).toString("hex")
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex")
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await sql`
      UPDATE investors
      SET reset_token = ${hashedToken}, reset_token_expires = ${resetTokenExpires}
      WHERE id = ${user.id}
    `

    const baseUrlRaw =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    const baseUrl = baseUrlRaw.replace(/\/$/, "")
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`

    await sendTransactionalEmail({
      to: email,
      subject: "Reset your PrivateEx password",
      text: `Hello ${user.full_name || "Investor"},\n\nUse this link to reset your password: ${resetLink}\n\nThis link expires in 1 hour.\nIf you did not request this, you can safely ignore this email.`,
      html: `<p>Hello ${user.full_name || "Investor"},</p><p>Use this link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 1 hour.</p><p>If you did not request this, you can safely ignore this email.</p>`,
    })

    return NextResponse.json({
      success: true,
      message: "If an account exists for this email, password reset instructions have been sent.",
    })
  } catch (error) {
    console.error("[v0] Forgot password error:", error)
    const message = error instanceof Error ? error.message : "An error occurred. Please try again."
    const status = message.startsWith("Invalid") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
