import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(["BRIDE", "GROOM", "PLANNER"])
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { label, allowedEventDayIds, expiresAt } = body

  // Update allowed days if provided
  if (allowedEventDayIds !== undefined) {
    await prisma.guestViewLinkEventDay.deleteMany({
      where: { guestViewLinkId: id }
    })

    await prisma.guestViewLinkEventDay.createMany({
      data: allowedEventDayIds.map((dayId: string) => ({
        guestViewLinkId: id,
        eventDayId: dayId
      }))
    })
  }

  const updated = await prisma.guestViewLink.update({
    where: { id },
    data: {
      ...(label && { label }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null })
    },
    include: {
      allowedEventDays: {
        include: {
          eventDay: true
        }
      }
    }
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(["BRIDE", "GROOM", "PLANNER"])
  if (error) return error

  const { id } = await params

  await prisma.guestViewLink.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}
