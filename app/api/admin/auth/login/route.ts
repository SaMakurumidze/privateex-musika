import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminCredentials, createAdminSession } from "@/lib/admin-auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

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
    return NextResponse.json({ error: "An error occurred during login" }, { status: 500 })
  }
}
