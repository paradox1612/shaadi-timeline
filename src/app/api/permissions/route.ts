import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireWedding, isBrideOrGroom } from "@/lib/api-helpers"
import { getPermissionPolicy, DEFAULT_PERMISSIONS } from "@/lib/permissions"
import { updatePermissionsPolicySchema } from "@/lib/validators"

// GET /api/permissions - Get current permission policy
export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  // Only internal users can view permissions
  const allowedRoles = [
    "BRIDE",
    "GROOM",
    "PLANNER",
    "BRIDE_PARENT",
    "GROOM_PARENT",
    "FAMILY_HELPER",
  ]
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const permissions = await getPermissionPolicy(wedding.id)

  // Also return the default permissions for reference
  return NextResponse.json({
    permissions,
    defaults: DEFAULT_PERMISSIONS,
    canEdit: isBrideOrGroom(session.user.role),
  })
}

// PUT /api/permissions - Update permission policy (bride/groom only)
export async function PUT(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  // Only bride/groom can edit permissions
  if (!isBrideOrGroom(session.user.role)) {
    return NextResponse.json(
      { error: "Only bride and groom can modify permissions" },
      { status: 403 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updatePermissionsPolicySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Upsert the permission policy
  const policy = await prisma.permissionPolicy.upsert({
    where: { weddingId: wedding.id },
    create: {
      weddingId: wedding.id,
      permissions: parsed.data.permissions,
    },
    update: {
      permissions: parsed.data.permissions,
    },
  })

  // Return the merged permissions
  const mergedPermissions = await getPermissionPolicy(wedding.id)

  return NextResponse.json({
    permissions: mergedPermissions,
    defaults: DEFAULT_PERMISSIONS,
    canEdit: true,
  })
}
