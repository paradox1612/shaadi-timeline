import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export async function POST(request: Request) {
  const { session, error } = await requireAuth(["BRIDE", "GROOM", "PLANNER"])
  if (error) return error

  const body = await request.json()
  const { eventDayId } = body

  if (!eventDayId) {
    return NextResponse.json(
      { error: "eventDayId required" },
      { status: 400 }
    )
  }

  // Get the most recent adjustment for this day
  const lastAdjustment = await prisma.timeAdjustment.findFirst({
    where: { eventDayId },
    orderBy: { appliedAt: "desc" },
    include: {
      fromItem: {
        select: { sortOrder: true }
      }
    }
  })

  if (!lastAdjustment) {
    return NextResponse.json(
      { error: "No adjustments to undo" },
      { status: 404 }
    )
  }

  // Get all items that were affected (at or after the adjustment point)
  const itemsToRevert = await prisma.timelineItem.findMany({
    where: {
      eventDayId,
      sortOrder: {
        gte: lastAdjustment.fromItem.sortOrder
      }
    },
    orderBy: { sortOrder: "asc" }
  })

  // Reverse the adjustment (opposite sign)
  const revertMs = -lastAdjustment.adjustmentMinutes * 60 * 1000

  // Update all items and delete the adjustment record
  await prisma.$transaction([
    // Revert all affected timeline items
    ...itemsToRevert.map((item) =>
      prisma.timelineItem.update({
        where: { id: item.id },
        data: {
          startTime: new Date(item.startTime.getTime() + revertMs),
          endTime: item.endTime
            ? new Date(item.endTime.getTime() + revertMs)
            : null
        }
      })
    ),
    // Delete the adjustment record
    prisma.timeAdjustment.delete({
      where: { id: lastAdjustment.id }
    })
  ])

  return NextResponse.json({
    success: true,
    revertedAdjustment: lastAdjustment.adjustmentMinutes,
    affectedItems: itemsToRevert.length
  })
}
