"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { signOut, useSession } from "next-auth/react"

interface VendorProfile {
  id: string
  type: string
  companyName: string
  contactName: string
  phone: string | null
  email: string | null
}

interface TimelineItem {
  id: string
  startTime: string
  endTime: string | null
  title: string
  locationName: string | null
  locationAddress: string | null
  locationGoogleMapsUrl: string | null
  vendorNotes: string | null
}

interface DayGroup {
  eventDay: {
    id: string
    label: string
    date: string
  }
  items: TimelineItem[]
}

const VENDOR_TYPE_LABELS: Record<string, string> = {
  PHOTOGRAPHER: "Photographer",
  VIDEOGRAPHER: "Videographer",
  DJ: "DJ",
  CATERER: "Caterer",
  DECOR: "Decor",
  MUA: "Makeup Artist",
  OTHER: "Other",
}

export default function VendorDashboardPage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [timeline, setTimeline] = useState<DayGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/vendor/me").then((res) => res.json()),
      fetch("/api/vendor/timeline").then((res) => res.json()),
    ]).then(([profileData, timelineData]) => {
      if (profileData.vendorProfile) {
        setProfile(profileData.vendorProfile)
      }
      setTimeline(Array.isArray(timelineData) ? timelineData : [])
      setLoading(false)
    })
  }, [])

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

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container p-6">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="text-xl font-bold text-pink-600">ShaadiTimeline</div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-right">
                <p className="font-medium">{session.user.name}</p>
                <p className="text-muted-foreground">Vendor</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {profile && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{profile.companyName}</CardTitle>
                  <Badge variant="secondary" className="mt-1">
                    {VENDOR_TYPE_LABELS[profile.type] || profile.type}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Contact:</span> {profile.contactName}
                </p>
                {profile.phone && (
                  <p>
                    <span className="text-muted-foreground">Phone:</span> {profile.phone}
                  </p>
                )}
                {profile.email && (
                  <p>
                    <span className="text-muted-foreground">Email:</span> {profile.email}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <h2 className="text-2xl font-bold mb-4">Your Schedule</h2>

        {timeline.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">
                You have no assigned timeline items yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {timeline.map((dayGroup) => (
              <Card key={dayGroup.eventDay.id}>
                <CardHeader>
                  <CardTitle>{dayGroup.eventDay.label}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(dayGroup.eventDay.date)}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dayGroup.items.map((item) => (
                      <div
                        key={item.id}
                        className="border-l-4 border-pink-500 pl-4 py-2"
                      >
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(item.startTime)}
                          {item.endTime && ` - ${formatTime(item.endTime)}`}
                        </p>
                        {item.locationName && (
                          <p className="text-sm text-muted-foreground">
                            {item.locationName}
                            {item.locationGoogleMapsUrl && (
                              <a
                                href={item.locationGoogleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-pink-600 underline"
                              >
                                View Map
                              </a>
                            )}
                          </p>
                        )}
                        {item.vendorNotes && (
                          <p className="text-sm mt-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                            <span className="font-medium">Notes:</span> {item.vendorNotes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
