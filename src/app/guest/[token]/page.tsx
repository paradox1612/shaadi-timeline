import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TimelineItem {
  id: string
  startTime: string
  endTime: string | null
  title: string
  locationName: string | null
  locationAddress: string | null
  locationGoogleMapsUrl: string | null
  audienceNotes: string | null
}

interface Day {
  id: string
  label: string
  date: string
  items: TimelineItem[]
}

interface GuestViewData {
  wedding: {
    name: string
    locationCity: string
  }
  guestLink: {
    label: string
  }
  days: Day[]
}

async function getGuestData(token: string): Promise<GuestViewData | null> {
  const { prisma } = await import("@/lib/prisma")

  try {
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

    if (!link) return null
    if (link.expiresAt && new Date() > link.expiresAt) return null

    return {
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
        date: aed.eventDay.date.toISOString(),
        items: aed.eventDay.timelineItems.map(item => ({
          ...item,
          startTime: item.startTime.toISOString(),
          endTime: item.endTime?.toISOString() ?? null
        }))
      }))
    }
  } catch {
    return null
  }
}

export default async function GuestViewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const data = await getGuestData(token)

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
        <Card className="max-w-md">
          <CardContent className="py-10 text-center">
            <h1 className="text-2xl font-bold mb-2">Link Not Found</h1>
            <p className="text-muted-foreground">
              This guest link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">{data.wedding.name}</h1>
          <p className="text-lg text-muted-foreground">{data.wedding.locationCity}</p>
          <p className="text-sm text-muted-foreground mt-2">{data.guestLink.label}</p>
        </div>

        <div className="space-y-8">
          {data.days.map((day) => (
            <Card key={day.id}>
              <CardHeader>
                <CardTitle>
                  {day.label}
                  <span className="text-sm font-normal text-muted-foreground ml-3">
                    {formatDate(day.date)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {day.items.map((item) => (
                    <div
                      key={item.id}
                      className="border-l-4 border-pink-500 pl-4 py-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{item.title}</h3>
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="mr-1"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {formatTime(item.startTime)}
                            {item.endTime && ` - ${formatTime(item.endTime)}`}
                          </div>
                          {item.locationName && (
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mr-1"
                              >
                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                <circle cx="12" cy="10" r="3" />
                              </svg>
                              {item.locationGoogleMapsUrl ? (
                                <a
                                  href={item.locationGoogleMapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-pink-600 underline"
                                >
                                  {item.locationName}
                                </a>
                              ) : (
                                item.locationName
                              )}
                            </div>
                          )}
                          {item.audienceNotes && (
                            <p className="text-sm mt-2">{item.audienceNotes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {day.items.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No events scheduled for this day yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Powered by ShaadiTimeline</p>
        </div>
      </div>
    </div>
  )
}
