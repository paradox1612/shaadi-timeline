import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"
import { randomBytes } from "crypto"

export async function GET() {
  const { session, error } = await requireAuth(["BRIDE", "GROOM", "PLANNER"])
  if (error) return error

  const wedding = await prisma.wedding.findFirst()
  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 })
  }

  const links = await prisma.guestViewLink.findMany({
    where: { weddingId: wedding.id },
    include: {
      allowedEventDays: {
        include: {
          eventDay: {
            select: {
              id: true,
              label: true,
              date: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return NextResponse.json(links)
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth(["BRIDE", "GROOM", "PLANNER"])
  if (error) return error

  const wedding = await prisma.wedding.findFirst()
  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 })
  }

  const body = await request.json()
  const { label, allowedEventDayIds, expiresAt } = body

  // Generate secure token
  const token = randomBytes(32).toString("hex")

  const link = await prisma.guestViewLink.create({
    data: {
      weddingId: wedding.id,
      token,
      label,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      allowedEventDays: {
        create: allowedEventDayIds.map((dayId: string) => ({
          eventDayId: dayId
        }))
      }
    },
    include: {
      allowedEventDays: {
        include: {
          eventDay: true
        }
      }
    }
  })

  return NextResponse.json(link, { status: 201 })
}
