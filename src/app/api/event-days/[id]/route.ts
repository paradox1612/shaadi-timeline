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
  const { date, label, sortOrder } = body

  const updated = await prisma.eventDay.update({
    where: { id },
    data: {
      ...(date && { date: new Date(date) }),
      ...(label && { label }),
      ...(sortOrder !== undefined && { sortOrder })
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

  await prisma.eventDay.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}
