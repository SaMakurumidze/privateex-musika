import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { assertEmail } from "@/lib/input-safety"

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail } = await request.json()
    const email = assertEmail(rawEmail)

    // Validation
    if (!email) {
      return NextResponse.json({ error: "Please enter your email address" }, { status: 400 })
    }

    // Check if email exists
    const user = await sql`
      SELECT id FROM investors WHERE email = ${email}
    `

    if (user.length > 0) {
      // In a real application, you would send an email here
      // For now, we just return a success message
      return NextResponse.json({
        success: true,
        message: "Password reset instructions have been sent to your email address.",
      })
    } else {
      return NextResponse.json({ error: "Email address not found" }, { status: 404 })
    }
  } catch (error) {
    console.error("[v0] Forgot password error:", error)
    const message = error instanceof Error ? error.message : "An error occurred. Please try again."
    const status = message.startsWith("Invalid") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
