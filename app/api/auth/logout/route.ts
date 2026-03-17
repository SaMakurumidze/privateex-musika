import { NextResponse } from "next/server"
import { destroySession } from "@/lib/auth"

export async function POST() {
  try {
    await destroySession()

    // Create redirect response to login page
    const response = NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"))
    
    // Clear all session cookies
    response.cookies.delete("session")
    response.cookies.delete("role")

    return response
  } catch (error) {
    // Even on error, redirect to login page
    const response = NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"))
    response.cookies.delete("session")
    response.cookies.delete("role")
    return response
  }
}
