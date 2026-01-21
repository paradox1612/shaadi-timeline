import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export async function GET(request: Request) {
  const { session, error } = await requireAuth(["VENDOR"])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const eventDayId = searchParams.get("eventDayId")

  if (!session.user.vendorProfileId) {
    return NextResponse.json({ error: "No vendor profile" }, { status: 400 })
  }

  const whereClause = {
    assignedVendors: {
      some: {
        vendorProfileId: session.user.vendorProfileId
      }
    },
    ...(eventDayId && { eventDayId })
  }

  const items = await prisma.timelineItem.findMany({
    where: whereClause,
    include: {
      eventDay: {
        select: {
          id: true,
          label: true,
          date: true
        }
      },
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
    orderBy: [{ startTime: "asc" }]
  })

  // Group by day
  const grouped = items.reduce((acc, item) => {
    const dayId = item.eventDay.id
    if (!acc[dayId]) {
      acc[dayId] = {
        eventDay: item.eventDay,
        items: []
      }
    }
    acc[dayId].items.push({
      id: item.id,
      startTime: item.startTime,
      endTime: item.endTime,
      title: item.title,
      locationName: item.locationName,
      locationAddress: item.locationAddress,
      locationGoogleMapsUrl: item.locationGoogleMapsUrl,
      vendorNotes: item.vendorNotes
    })
    return acc
  }, {} as Record<string, { eventDay: typeof items[0]['eventDay'], items: Array<{
    id: string
    startTime: Date
    endTime: Date | null
    title: string
    locationName: string | null
    locationAddress: string | null
    locationGoogleMapsUrl: string | null
    vendorNotes: string | null
  }> }>)

  return NextResponse.json(Object.values(grouped))
}
