import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const wedding = await prisma.wedding.findFirst()
  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 })
  }

  const eventDays = await prisma.eventDay.findMany({
    where: { weddingId: wedding.id },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { timelineItems: true }
      }
    }
  })

  return NextResponse.json(eventDays)
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth(["BRIDE", "GROOM", "PLANNER"])
  if (error) return error

  const wedding = await prisma.wedding.findFirst()
  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 })
  }

  const body = await request.json()
  const { date, label, sortOrder } = body

  const eventDay = await prisma.eventDay.create({
    data: {
      weddingId: wedding.id,
      date: new Date(date),
      label,
      sortOrder: sortOrder ?? 0
    }
  })

  return NextResponse.json(eventDay, { status: 201 })
}
