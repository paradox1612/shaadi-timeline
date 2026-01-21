"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Nav } from "@/components/nav"
import { useSession } from "next-auth/react"

interface EventDay {
  id: string
  label: string
  date: string
}

interface GuestLink {
  id: string
  token: string
  label: string
  createdAt: string
  expiresAt: string | null
  allowedEventDays: { eventDay: EventDay }[]
}

export default function GuestLinksPage() {
  const { data: session } = useSession()
  const [links, setLinks] = useState<GuestLink[]>([])
  const [eventDays, setEventDays] = useState<EventDay[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddLink, setShowAddLink] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [formLabel, setFormLabel] = useState("")
  const [formExpiresAt, setFormExpiresAt] = useState("")
  const [selectedDays, setSelectedDays] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      fetch("/api/guest-links").then((res) => res.json()),
      fetch("/api/event-days").then((res) => res.json()),
    ]).then(([linksData, daysData]) => {
      setLinks(Array.isArray(linksData) ? linksData : [])
      setEventDays(Array.isArray(daysData) ? daysData : [])
      setLoading(false)
    })
  }, [])

  const resetForm = () => {
    setFormLabel("")
    setFormExpiresAt("")
    setSelectedDays([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedDays.length === 0) {
      alert("Please select at least one event day")
      return
    }

    const res = await fetch("/api/guest-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: formLabel,
        expiresAt: formExpiresAt || null,
        allowedEventDayIds: selectedDays,
      }),
    })
    if (res.ok) {
      const newLink = await res.json()
      setLinks([newLink, ...links])
      setShowAddLink(false)
      resetForm()
    }
  }

  const handleDelete = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this guest link?")) return
    const res = await fetch(`/api/guest-links/${linkId}`, {
      method: "DELETE",
    })
    if (res.ok) {
      setLinks(links.filter((l) => l.id !== linkId))
    }
  }

  const copyLink = (link: GuestLink) => {
    const url = `${window.location.origin}/guest/${link.token}`
    navigator.clipboard.writeText(url)
    setCopiedId(link.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const toggleDay = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayId))
    } else {
      setSelectedDays([...selectedDays, dayId])
    }
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
      <Nav userName={session.user.name} userRole={session.user.role} />

      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Guest Links</h1>
            <p className="text-muted-foreground">
              Create shareable links for guests to view the schedule
            </p>
          </div>
          <Dialog
            open={showAddLink}
            onOpenChange={(open) => {
              setShowAddLink(open)
              if (!open) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button>+ Create Link</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Guest Link</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="linkLabel">Link Name</Label>
                  <Input
                    id="linkLabel"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="e.g., Groom's Family, Bride's Friends"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expiresAt">Expires At (optional)</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Select Event Days</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Choose which days guests can view with this link
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {eventDays.map((day) => (
                      <Badge
                        key={day.id}
                        variant={selectedDays.includes(day.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleDay(day.id)}
                      >
                        {day.label}
                      </Badge>
                    ))}
                  </div>
                  {eventDays.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      No event days created yet. Add event days in the Timeline section first.
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={eventDays.length === 0}>
                    Create Link
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {links.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground mb-4">
                No guest links created yet. Create a link to share schedules with your guests.
              </p>
              <Button onClick={() => setShowAddLink(true)}>Create Guest Link</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {links.map((link) => (
              <Card key={link.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{link.label}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(link.createdAt).toLocaleDateString()}
                        {link.expiresAt &&
                          ` • Expires ${new Date(link.expiresAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(link)}
                      >
                        {copiedId === link.id ? "Copied!" : "Copy Link"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleDelete(link.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Days included:</span>
                    {link.allowedEventDays.map((aed) => (
                      <Badge key={aed.eventDay.id} variant="secondary">
                        {aed.eventDay.label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 font-mono bg-gray-100 p-2 rounded">
                    {typeof window !== "undefined" && `${window.location.origin}/guest/${link.token}`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
