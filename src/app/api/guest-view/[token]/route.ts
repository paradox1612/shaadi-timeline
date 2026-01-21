import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type GuestViewLinkWithDays = Prisma.GuestViewLinkGetPayload<{
  include: {
    wedding: true
    allowedEventDays: {
      include: {
        eventDay: {
          include: {
            timelineItems: true
          }
        }
      }
    }
  }
}>

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const link = (await prisma.guestViewLink.findUnique({
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
  })) as GuestViewLinkWithDays | null

  if (!link) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 })
  }

  if (link.expiresAt && new Date() > link.expiresAt) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 })
  }

  // Format response
  const response = {
    wedding: {
      name: link.wedding.name,
      locationCity: link.wedding.locationCity
    },
    guestLink: {
      label: link.label
    },
    days: link.allowedEventDays.map(aed => ({
      id: aed.eventDay.id,
      label: aed.eventDay.label,
      date: aed.eventDay.date,
      items: aed.eventDay.timelineItems
    }))
  }

  return NextResponse.json(response)
}
