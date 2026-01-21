import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { UserRole } from "@prisma/client"

export async function requireAuth(allowedRoles?: UserRole[]) {
  const session = await auth()

  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { session }
}

export function isInternalUser(role: UserRole) {
  return ["BRIDE", "GROOM", "PLANNER"].includes(role)
}
