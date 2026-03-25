import { NextResponse } from "next/server"
import { destroySession } from "@/lib/auth"

export async function POST(request: Request) {
  const redirectUrl = new URL("/", request.url)
  try {
    await destroySession()

    // Use current request origin to avoid localhost redirects in production.
    const response = NextResponse.redirect(redirectUrl, 303)
    
    // Clear all session cookies
    response.cookies.delete("session")
    response.cookies.delete("role")

    return response
  } catch (error) {
    // Even on error, redirect to login page
    const response = NextResponse.redirect(redirectUrl, 303)
    response.cookies.delete("session")
    response.cookies.delete("role")
    return response
  }
}
