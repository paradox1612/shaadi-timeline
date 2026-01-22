import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireWedding } from "@/lib/api-helpers"
import { canManagePhotos } from "@/lib/permissions"

// GET /api/admin/photos - Get all photos for the wedding
export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  const canManage = await canManagePhotos(
    session.user.id,
    session.user.role,
    wedding.id
  )

  if (!canManage) {
    return NextResponse.json(
      { error: "You don't have permission to manage photos" },
      { status: 403 }
    )
  }

  const photos = await prisma.photo.findMany({
    where: { weddingId: wedding.id },
    include: {
      guest: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(photos)
}
