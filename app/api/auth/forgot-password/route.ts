import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validation
    if (!email) {
      return NextResponse.json({ error: "Please enter your email address" }, { status: 400 })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
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
    return NextResponse.json({ error: "An error occurred. Please try again." }, { status: 500 })
  }
}
