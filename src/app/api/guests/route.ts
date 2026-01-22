import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { createId } from "@paralleldrive/cuid2"

const createGuestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  weddingId: z.string().optional(),
})

// POST /api/guests - Create a new guest
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validation = createGuestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: validation.error.issues },
        { status: 400 }
      )
    }

    let { name, weddingId } = validation.data

    // If weddingId is not provided, find the first wedding
    if (!weddingId) {
      const firstWedding = await prisma.wedding.findFirst()
      if (!firstWedding) {
        return NextResponse.json(
          { error: "No wedding found" },
          { status: 404 }
        )
      }
      weddingId = firstWedding.id
    }

    const token = createId()

    const guest = await prisma.guest.create({
      data: {
        name,
        weddingId,
        token,
      },
    })

    return NextResponse.json(guest, { status: 201 })
  } catch (error) {
    console.error("Error creating guest:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET /api/guests?token=... - Get guest by token
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 })
  }

  try {
    const guest = await prisma.guest.findUnique({
      where: { token },
    })

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 })
    }

    return NextResponse.json(guest)
  } catch (error) {
    console.error("Error fetching guest:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
