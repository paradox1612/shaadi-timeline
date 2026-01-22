import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireWedding } from "@/lib/api-helpers"

// GET /api/gallery/photos - Get all approved photos for the wedding
export async function GET() {
  try {
    const { wedding, error: weddingError } = await requireWedding()
    if (weddingError) return weddingError

    const photos = await prisma.photo.findMany({
      where: {
        weddingId: wedding.id,
        status: "APPROVED",
      },
      include: {
        guest: {
          select: {
            name: true,
          },
        },
        timelineItem: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(photos)
  } catch (error) {
    console.error("Error fetching photos:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
