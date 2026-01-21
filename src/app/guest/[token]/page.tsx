import { Card, CardContent } from "@/components/ui/card"
import { Clock, MapPin, ExternalLink, CalendarHeart, Heart } from "lucide-react"

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-pink-50 p-4">
        <Card className="max-w-sm w-full border-0 shadow-xl">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8 text-rose-400" />
            </div>
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

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative container mx-auto px-4 pt-12 pb-8 max-w-lg text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <CalendarHeart className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">
            {data.wedding.name}
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {data.wedding.locationCity}
          </p>
          {data.guestLink.label && (
            <p className="text-sm text-muted-foreground mt-3 px-3 py-1.5 bg-white/60 rounded-full inline-block">
              {data.guestLink.label}
            </p>
          )}
        </div>
      </div>

      {/* Day Pills - Horizontal scroll for multiple days */}
      {data.days.length > 1 && (
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b">
          <div className="container mx-auto max-w-lg">
            <div className="flex gap-2 overflow-x-auto py-3 px-4 scrollbar-hide">
              {data.days.map((day) => (
                <a
                  key={day.id}
                  href={`#day-${day.id}`}
                  className="flex-shrink-0 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  {day.label}
                  <span className="ml-1.5 text-primary/60">{formatShortDate(day.date)}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timeline Content */}
      <div className="container mx-auto px-4 py-6 max-w-lg">
        <div className="space-y-8">
          {data.days.map((day) => (
            <section key={day.id} id={`day-${day.id}`} className="scroll-mt-20">
              {/* Day Header */}
              <div className="mb-4">
                <h2 className="text-xl font-bold">{day.label}</h2>
                <p className="text-sm text-muted-foreground">{formatDate(day.date)}</p>
              </div>

              {/* Events */}
              {day.items.length > 0 ? (
                <div className="space-y-3">
                  {day.items.map((item, index) => (
                    <Card
                      key={item.id}
                      className="border-0 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
                    >
                      <CardContent className="p-0">
                        <div className="flex">
                          {/* Time stripe */}
                          <div className="w-1.5 bg-gradient-to-b from-primary to-primary/60 flex-shrink-0" />

                          <div className="flex-1 p-4">
                            {/* Time */}
                            <div className="flex items-center gap-2 text-sm text-primary font-medium mb-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {formatTime(item.startTime)}
                                {item.endTime && (
                                  <span className="text-muted-foreground font-normal">
                                    {" "}- {formatTime(item.endTime)}
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 className="font-semibold text-lg leading-tight">
                              {item.title}
                            </h3>

                            {/* Location */}
                            {item.locationName && (
                              <div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <div>
                                  {item.locationGoogleMapsUrl ? (
                                    <a
                                      href={item.locationGoogleMapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                      {item.locationName}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ) : (
                                    <span>{item.locationName}</span>
                                  )}
                                  {item.locationAddress && (
                                    <p className="text-xs text-muted-foreground/80 mt-0.5">
                                      {item.locationAddress}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {item.audienceNotes && (
                              <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-dashed">
                                {item.audienceNotes}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-2">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      Schedule coming soon
                    </p>
                  </CardContent>
                </Card>
              )}
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pb-8">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground/60">
            <Heart className="h-4 w-4 text-primary/40" />
            <span>kush love for freya</span>
          </div>
        </div>
      </div>
    </div>
  )
}
