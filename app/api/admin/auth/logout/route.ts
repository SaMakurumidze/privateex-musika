import { NextResponse } from "next/server"
import { destroyAdminSession } from "@/lib/admin-auth"

export async function POST() {
  try {
    await destroyAdminSession()
    
    const response = NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"))
    response.cookies.delete("admin_session")
    response.cookies.delete("admin_role")
    
    return response
  } catch (error) {
    const response = NextResponse.redirect(new URL("/admin", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"))
    response.cookies.delete("admin_session")
    response.cookies.delete("admin_role")
    return response
  }
}
