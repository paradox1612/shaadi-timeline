import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export async function POST(request: Request) {
  const { session, error } = await requireAuth(["BRIDE", "GROOM", "PLANNER"])
  if (error) return error

  const body = await request.json()
  const { eventDayId, fromItemId, adjustmentMinutes, reason } = body

  if (!eventDayId || !fromItemId || adjustmentMinutes === undefined) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    )
  }

  if (adjustmentMinutes === 0) {
    return NextResponse.json(
      { error: "Adjustment must be non-zero" },
      { status: 400 }
    )
  }

  // Get the starting item to find its sortOrder
  const fromItem = await prisma.timelineItem.findUnique({
    where: { id: fromItemId },
    select: { sortOrder: true, startTime: true, eventDayId: true }
  })

  if (!fromItem) {
    return NextResponse.json(
      { error: "Timeline item not found" },
      { status: 404 }
    )
  }

  // Verify the item belongs to the specified event day
  if (fromItem.eventDayId !== eventDayId) {
    return NextResponse.json(
      { error: "Timeline item does not belong to the specified event day" },
      { status: 400 }
    )
  }

  // Get all items on this day that come at or after this item
  const itemsToAdjust = await prisma.timelineItem.findMany({
    where: {
      eventDayId,
      sortOrder: {
        gte: fromItem.sortOrder
      }
    },
    orderBy: { sortOrder: "asc" }
  })

  // Calculate adjustment in milliseconds
  const adjustmentMs = adjustmentMinutes * 60 * 1000

  // Update all items in a transaction
  await prisma.$transaction([
    // Create adjustment record
    prisma.timeAdjustment.create({
      data: {
        eventDayId,
        fromItemId,
        adjustmentMinutes,
        reason: reason || null,
        appliedByUserId: session.user.id
      }
    }),
    // Update all affected timeline items
    ...itemsToAdjust.map((item) =>
      prisma.timelineItem.update({
        where: { id: item.id },
        data: {
          startTime: new Date(item.startTime.getTime() + adjustmentMs),
          endTime: item.endTime
            ? new Date(item.endTime.getTime() + adjustmentMs)
            : null
        }
      })
    )
  ])

  return NextResponse.json({
    success: true,
    affectedItems: itemsToAdjust.length,
    adjustmentMinutes
  })
}

export async function GET(request: Request) {
  const { session, error } = await requireAuth(["BRIDE", "GROOM", "PLANNER"])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const eventDayId = searchParams.get("eventDayId")

  if (!eventDayId) {
    return NextResponse.json(
      { error: "eventDayId required" },
      { status: 400 }
    )
  }

  const adjustments = await prisma.timeAdjustment.findMany({
    where: { eventDayId },
    include: {
      appliedBy: {
        select: {
          name: true,
          role: true
        }
      },
      fromItem: {
        select: {
          title: true
        }
      }
    },
    orderBy: { appliedAt: "desc" },
    take: 20
  })

  return NextResponse.json(adjustments)
}
