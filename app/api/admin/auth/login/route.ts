import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminCredentials, createAdminSession } from "@/lib/admin-auth"
import { assertEmail, asTrimmedString } from "@/lib/input-safety"

export async function POST(request: NextRequest) {
  try {
    const { email: rawEmail, password: rawPassword } = await request.json()
    const email = assertEmail(rawEmail)
    const password = asTrimmedString(rawPassword)

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const admin = await verifyAdminCredentials(email, password)

    if (!admin) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    await createAdminSession(admin.id, admin.role)

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      redirect: "/admin/dashboard",
    })
  } catch (error) {
    console.error("Admin login error:", error)
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
