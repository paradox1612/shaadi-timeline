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
  const { assignedVendorIds, ...itemData } = body

  // If updating vendor assignments
  if (assignedVendorIds !== undefined) {
    // Delete existing assignments
    await prisma.timelineItemVendor.deleteMany({
      where: { timelineItemId: id }
    })

    // Create new assignments
    if (assignedVendorIds.length > 0) {
      await prisma.timelineItemVendor.createMany({
        data: assignedVendorIds.map((vendorId: string) => ({
          timelineItemId: id,
          vendorProfileId: vendorId
        }))
      })
    }
  }

  const updated = await prisma.timelineItem.update({
    where: { id },
    data: {
      ...itemData,
      ...(itemData.startTime && { startTime: new Date(itemData.startTime) }),
      ...(itemData.endTime && { endTime: new Date(itemData.endTime) })
    },
    include: {
      assignedVendors: {
        include: {
          vendor: true
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

  await prisma.timelineItem.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}
