import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export async function requireAuth(allowedRoles?: UserRole[]) {
  const session = await auth()

  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  // Verify user exists in DB (handles stale JWTs after DB reset)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  })

  if (!user) {
    return { error: NextResponse.json({ error: "User not found. Please login again." }, { status: 401 }) }
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { session, user }
}

// Returns true for bride, groom, and planner (core internal team)
export function isInternalUser(role: UserRole) {
  return ["BRIDE", "GROOM", "PLANNER"].includes(role)
}

// Returns true for bride and groom only
export function isBrideOrGroom(role: UserRole) {
  return role === "BRIDE" || role === "GROOM"
}

// Returns true for all roles that should see the main dashboard (not vendor dashboard)
export function isDashboardUser(role: UserRole) {
  return [
    "BRIDE",
    "GROOM",
    "PLANNER",
    "BRIDE_PARENT",
    "GROOM_PARENT",
    "FAMILY_HELPER",
  ].includes(role)
}

// Returns true for parent roles
export function isParent(role: UserRole) {
  return role === "BRIDE_PARENT" || role === "GROOM_PARENT"
}

// Returns true for family helper role
export function isFamilyHelper(role: UserRole) {
  return role === "FAMILY_HELPER"
}

// Returns true for vendor role
export function isVendor(role: UserRole) {
  return role === "VENDOR"
}

// Helper to get the first wedding (assuming single-wedding deployment)
export async function getWedding() {
  const wedding = await prisma.wedding.findFirst({
    orderBy: { createdAt: "asc" },
  })
  return wedding
}

// Helper to get wedding ID with error response if not found
export async function requireWedding() {
  const wedding = await getWedding()
  if (!wedding) {
    return {
      error: NextResponse.json(
        { error: "No wedding configured" },
        { status: 404 }
      ),
    }
  }
  return { wedding }
}
