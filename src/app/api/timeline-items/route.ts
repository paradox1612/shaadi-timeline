import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isInternalUser } from "@/lib/api-helpers"

export async function GET(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const eventDayId = searchParams.get("eventDayId")

  if (!eventDayId) {
    return NextResponse.json({ error: "eventDayId required" }, { status: 400 })
  }

  let items

  if (isInternalUser(session.user.role)) {
    // Internal users see everything
    items = await prisma.timelineItem.findMany({
      where: { eventDayId },
      include: {
        assignedVendors: {
          include: {
            vendor: {
              select: {
                id: true,
                companyName: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }]
    })
  } else if (session.user.role === "VENDOR") {
    // Vendors see only assigned items
    items = await prisma.timelineItem.findMany({
      where: {
        eventDayId,
        assignedVendors: {
          some: {
            vendorProfileId: session.user.vendorProfileId
          }
        }
      },
      include: {
        assignedVendors: {
          include: {
            vendor: {
              select: {
                id: true,
                companyName: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }]
    })
  }

  return NextResponse.json(items)
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth(["BRIDE", "GROOM", "PLANNER"])
  if (error) return error

  const body = await request.json()
  const { assignedVendorIds, ...itemData } = body

  const item = await prisma.timelineItem.create({
    data: {
      ...itemData,
      createdByUserId: session.user.id,
      startTime: new Date(itemData.startTime),
      endTime: itemData.endTime ? new Date(itemData.endTime) : null,
      assignedVendors: {
        create: assignedVendorIds?.map((vendorId: string) => ({
          vendorProfileId: vendorId
        })) || []
      }
    },
    include: {
      assignedVendors: {
        include: {
          vendor: true
        }
      }
    }
  })

  return NextResponse.json(item, { status: 201 })
}
