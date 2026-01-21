import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes
  if (pathname.startsWith("/guest/") || pathname === "/login") {
    return NextResponse.next()
  }

  // Require auth for all other routes
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = session.user.role

  // Route vendors to vendor area
  if (role === "VENDOR" && !pathname.startsWith("/vendor")) {
    return NextResponse.redirect(new URL("/vendor", req.url))
  }

  // Route internal users to dashboard
  if (["BRIDE", "GROOM", "PLANNER"].includes(role) && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Prevent vendors from accessing internal routes
  if (role === "VENDOR" && !pathname.startsWith("/vendor") && !pathname.startsWith("/api/vendor")) {
    return NextResponse.redirect(new URL("/vendor", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"]
}
