import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const session = request.cookies.get("session")
  const adminSession = request.cookies.get("admin_session")
  const { pathname } = request.nextUrl

  // Admin routes
  if (pathname.startsWith("/admin")) {
    // Admin login page - allow access, redirect if already logged in
    if (pathname === "/admin") {
      if (adminSession) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url))
      }
      return NextResponse.next()
    }
    
    // Protected admin routes - require admin session
    if (pathname.startsWith("/admin/dashboard")) {
      if (!adminSession) {
        return NextResponse.redirect(new URL("/admin", request.url))
      }
      return NextResponse.next()
    }
    
    return NextResponse.next()
  }

  // Public routes
  if (pathname === "/" || pathname === "/login") {
    // If already logged in, redirect to dashboard
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    return NextResponse.next()
  }

  // Protected routes - require authentication
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
