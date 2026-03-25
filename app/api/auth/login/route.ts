import { type NextRequest, NextResponse } from "next/server"
import { verifyCredentials, createSession } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

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
    return NextResponse.json({ error: "An error occurred during login" }, { status: 500 })
  }
}
