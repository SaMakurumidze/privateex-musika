import { NextResponse } from "next/server"
import { destroyAdminSession } from "@/lib/admin-auth"

export async function POST(request: Request) {
  const redirectUrl = new URL("/admin", request.url)
  try {
    await destroyAdminSession()
    
    const response = NextResponse.redirect(redirectUrl, 303)
    response.cookies.delete("admin_session")
    response.cookies.delete("admin_role")
    
    return response
  } catch {
    const response = NextResponse.redirect(redirectUrl, 303)
    response.cookies.delete("admin_session")
    response.cookies.delete("admin_role")
    return response
  }
}
