import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-helpers"
import { hasPermission, PermissionCapability } from "@/lib/permissions"
import { z } from "zod"

const permissionCheckSchema = z.object({
  capability: z.string(),
  weddingId: z.string(),
})

// GET /api/permissions?capability=...&weddingId=...
export async function GET(req: Request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const capability = searchParams.get("capability")
  const weddingId = searchParams.get("weddingId")

  if (!capability || !weddingId) {
    return NextResponse.json(
      { error: "capability and weddingId are required" },
      { status: 400 }
    )
  }

  const hasPerm = await hasPermission(
    session.user.id,
    session.user.role,
    weddingId,
    capability as PermissionCapability
  )

  return NextResponse.json({ hasPermission: hasPerm })
}