import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type GuestViewAllowedEventDay = {
  eventDay: {
    id: string
    label: string
    date: Date
    timelineItems: Array<{
      id: string
      startTime: Date | null
      endTime: Date | null
      title: string
      locationName: string | null
      locationAddress: string | null
      locationGoogleMapsUrl: string | null
      audienceNotes: string | null
    }>
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const link = await prisma.guestViewLink.findUnique({
    where: { token },
    include: {
      wedding: true,
      allowedEventDays: {
        include: {
          eventDay: {
            include: {
              timelineItems: {
                where: {
                  visibility: "AUDIENCE"
                },
                orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
                select: {
                  id: true,
                  startTime: true,
                  endTime: true,
                  title: true,
                  locationName: true,
                  locationAddress: true,
                  locationGoogleMapsUrl: true,
                  audienceNotes: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 })
  }

  if (link.expiresAt && new Date() > link.expiresAt) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 })
  }

  const allowedEventDays = link.allowedEventDays as GuestViewAllowedEventDay[]

  // Format response
  const response = {
    wedding: {
      name: link.wedding.name,
      locationCity: link.wedding.locationCity
    },
    guestLink: {
      label: link.label
    },
    days: allowedEventDays.map((aed) => ({
      id: aed.eventDay.id,
      label: aed.eventDay.label,
      date: aed.eventDay.date,
      items: aed.eventDay.timelineItems
    }))
  }

  return NextResponse.json(response)
}
