import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/storage"
import path from "path"

// POST /api/photos - Upload a new photo
export async function POST(req: Request) {
  try {
    const guestToken = req.headers.get("Authorization")?.split(" ")[1]

    if (!guestToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const guest = await prisma.guest.findUnique({
      where: { token: guestToken },
    })

    if (!guest) {
      return NextResponse.json({ error: "Invalid guest token" }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const caption = formData.get("caption") as string | null
    const timelineItemId = formData.get("timelineItemId") as string | null

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileExtension = path.extname(file.name)
    const fileName = `${Date.now()}${fileExtension}`

    const fileUrl = await uploadFile(buffer, fileName, file.type)

    const photo = await prisma.photo.create({
      data: {
        url: fileUrl,
        caption,
        weddingId: guest.weddingId,
        timelineItemId,
        guestId: guest.id,
      },
    })

    return NextResponse.json(photo, { status: 201 })
  } catch (error) {
    console.error("Error uploading photo:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET /api/photos - Get all photos for the current guest
export async function GET(req: Request) {
  try {
    const guestToken = req.headers.get("Authorization")?.split(" ")[1]

    if (!guestToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const guest = await prisma.guest.findUnique({
      where: { token: guestToken },
    })

    if (!guest) {
      return NextResponse.json({ error: "Invalid guest token" }, { status: 403 })
    }

    const photos = await prisma.photo.findMany({
      where: { guestId: guest.id },
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
