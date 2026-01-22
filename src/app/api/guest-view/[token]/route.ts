import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/guest-view/[token] - Get guest view data
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
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
                    visibility: "AUDIENCE",
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
                    audienceNotes: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 })
    }
    if (link.expiresAt && new Date() > link.expiresAt) {
      return NextResponse.json({ error: "Link expired" }, { status: 404 })
    }

    const responseData = {
      wedding: {
        name: link.wedding.name,
        locationCity: link.wedding.locationCity,
      },
      guestLink: {
        label: link.label,
      },
      days: link.allowedEventDays.map((aed) => ({
        id: aed.eventDay.id,
        label: aed.eventDay.label,
        date: aed.eventDay.date.toISOString(),
        items: aed.eventDay.timelineItems.map((item) => ({
          ...item,
          startTime: item.startTime.toISOString(),
          endTime: item.endTime?.toISOString() ?? null,
        })),
      })),
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error fetching guest view data:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
