import { type NextRequest, NextResponse } from "next/server"
import { createSQLClient } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 })
    }

    const sql = createSQLClient()

    // Find investor with this token
    const investors = await sql`
      SELECT id, email, email_verified, token_expires
      FROM investors
      WHERE email_verification_token = ${token}
    `

    if (investors.length === 0) {
      return NextResponse.json({ error: "Invalid verification token" }, { status: 400 })
    }

    const investor = investors[0]

    // Check if already verified
    if (investor.email_verified) {
      return NextResponse.json({ 
        success: true, 
        message: "Email already verified. You can now log in.",
        alreadyVerified: true 
      })
    }

    // Check if token has expired
    if (new Date() > new Date(investor.token_expires)) {
      return NextResponse.json({ 
        error: "Verification link has expired. Please register again or request a new verification email." 
      }, { status: 400 })
    }

    // Verify the email
    await sql`
      UPDATE investors
      SET 
        email_verified = TRUE,
        email_verification_token = NULL,
        token_expires = NULL
      WHERE id = ${investor.id}
    `

    return NextResponse.json({
      success: true,
      message: "Email verified successfully! You can now log in to your account.",
      email: investor.email
    })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 })
  }
}
