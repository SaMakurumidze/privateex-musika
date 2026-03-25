import { type NextRequest, NextResponse } from "next/server"
import { createSQLClient } from "@/lib/db"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = typeof body.token === "string" ? body.token.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : ""

    if (!token || !password || !confirmPassword) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 },
      )
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 })
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")
    const sql = createSQLClient()

    const users = await sql`
      SELECT id
      FROM investors
      WHERE reset_token = ${hashedToken}
        AND reset_token_expires > NOW()
      LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired reset link." },
        { status: 400 },
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await sql`
      UPDATE investors
      SET
        password = ${hashedPassword},
        reset_token = NULL,
        reset_token_expires = NULL
      WHERE id = ${users[0].id}
    `

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. You can now log in.",
    })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: "Failed to reset password. Please try again." },
      { status: 500 },
    )
  }
}
