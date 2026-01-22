import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"

// Roles that should see the main dashboard (not vendor dashboard)
const DASHBOARD_ROLES: UserRole[] = [
  "BRIDE",
  "GROOM",
  "PLANNER",
  "BRIDE_PARENT",
  "GROOM_PARENT",
  "FAMILY_HELPER",
]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Public routes
  if (
    pathname.startsWith("/guest/") || 
    pathname === "/login" || 
    pathname.startsWith("/api/guest-view/") ||
    pathname === "/gallery" ||
    pathname === "/my-uploads" ||
    pathname === "/api/gallery/photos" ||
    pathname === "/api/photos" ||
    pathname.startsWith("/api/guests")
  ) {
    return NextResponse.next()
  }

  // Require auth for all other routes
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = session.user.role as UserRole

  // Route vendors to vendor area
  if (role === "VENDOR" && !pathname.startsWith("/vendor") && !pathname.startsWith("/api")) {
    return NextResponse.redirect(new URL("/vendor", req.url))
  }

  // Route dashboard users to dashboard when accessing root
  if (DASHBOARD_ROLES.includes(role) && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Prevent vendors from accessing internal routes (except API routes they need)
  if (role === "VENDOR") {
    const allowedVendorPaths = [
      "/vendor",
      "/api/vendor",
      "/api/tasks",      // Vendors can access their assigned tasks
      "/api/quotes",     // Vendors can view their quotes
      "/api/payments",   // Vendors can view their payments
    ]

    const isAllowed = allowedVendorPaths.some(
      (path) => pathname.startsWith(path)
    )

    if (!isAllowed) {
      return NextResponse.redirect(new URL("/vendor", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
}
