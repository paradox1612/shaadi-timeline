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

  const updated = await prisma.vendorProfile.update({
    where: { id },
    data: body
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

  await prisma.vendorProfile.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}
