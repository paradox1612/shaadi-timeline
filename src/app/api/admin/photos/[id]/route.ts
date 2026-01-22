import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireWedding } from "@/lib/api-helpers"
import { canManagePhotos } from "@/lib/permissions"
import { z } from "zod"

const updatePhotoSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
})

// PUT /api/admin/photos/[id] - Update a photo's status
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id: photoId } = await params
    const body = await req.json()
    const validation = updatePhotoSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: validation.error.issues },
        { status: 400 }
      )
    }

    const { status } = validation.data

    try {
      const updatedPhoto = await prisma.photo.update({
        where: { id: photoId },
        data: {
          status,
          approvedById:
            status === "APPROVED" ? session.user.id : null,
          rejectedById:
            status === "REJECTED" ? session.user.id : null,
        },
      })

      return NextResponse.json(updatedPhoto)
    } catch (updateError: any) {
      if (updateError.code === "P2025") {
        return NextResponse.json({ error: "Photo not found" }, { status: 404 })
      }
      throw updateError
    }
  } catch (error) {
    console.error("Error updating photo:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
