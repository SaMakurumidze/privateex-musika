import { type NextRequest, NextResponse } from "next/server"
import { verifyCredentials, createSession } from "@/lib/auth"
import { assertEmail, asTrimmedString } from "@/lib/input-safety"

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, password: rawPassword } = await request.json()
    const email = assertEmail(rawEmail)
    const password = asTrimmedString(rawPassword)

    if (!email || !password) {
      return NextResponse.json({ error: "Please fill in all fields" }, { status: 400 })
    }

    // Check for demo admin account
    if (email === "admin@privateex.com" && password === "admin123") {
      // Create a demo admin session
      const response = NextResponse.json({
        success: true,
        redirect: "/dashboard",
        user: {
          id: 0,
          full_name: "Admin User",
          email: "admin@privateex.com",
          role: "admin",
        },
      })

      response.cookies.set("session", "0", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })

      response.cookies.set("role", "admin", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      })

      return response
    }

    // Verify credentials against database
    const investor = await verifyCredentials(email, password)

    if (!investor) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    if (investor.force_password_change) {
      return NextResponse.json({
        success: true,
        requirePasswordChange: true,
        email: investor.email,
        message: "Temporary password accepted. Please create a new password to continue.",
      })
    }

    // Create session
    await createSession(investor.id)

    // Set role cookie for middleware
    const response = NextResponse.json({
      success: true,
      redirect: "/dashboard",
      user: investor,
    })

    response.cookies.set("role", investor.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    const message = error instanceof Error ? error.message : "An error occurred during login"
    if (message === "AUTH_DB_ERROR") {
      return NextResponse.json(
        { error: "Authentication service is unavailable. Please contact support." },
        { status: 500 },
      )
    }
    const status = message.startsWith("Invalid") ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
