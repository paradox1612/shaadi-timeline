"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Nav } from "@/components/nav"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  Plus,
  Link2,
  Copy,
  Check,
  Trash2,
  Clock,
  ExternalLink,
} from "lucide-react"

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
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  // Link Form Component
  const LinkForm = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="linkLabel" className="text-sm font-medium">Link Name</Label>
        <Input
          id="linkLabel"
          value={formLabel}
          onChange={(e) => setFormLabel(e.target.value)}
          placeholder="e.g., Groom's Family, Bride's Friends"
          className="mt-1.5 h-12 rounded-xl"
          required
        />
      </div>

      <div>
        <Label htmlFor="expiresAt" className="text-sm font-medium">Expires At (optional)</Label>
        <Input
          id="expiresAt"
          type="datetime-local"
          value={formExpiresAt}
          onChange={(e) => setFormExpiresAt(e.target.value)}
          className="mt-1.5 h-12 rounded-xl"
        />
      </div>

      <div>
        <Label className="text-sm font-medium">Select Event Days</Label>
        <p className="text-xs text-muted-foreground mb-3">
          Choose which days guests can view with this link
        </p>
        {eventDays.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {eventDays.map((day) => (
              <Badge
                key={day.id}
                variant={selectedDays.includes(day.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer py-2 px-3 rounded-full transition-all",
                  selectedDays.includes(day.id) && "shadow-sm"
                )}
                onClick={() => toggleDay(day.id)}
              >
                {day.label}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground p-3 bg-muted rounded-xl">
            No event days created yet. Add event days in the Timeline section first.
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-12 rounded-xl"
        disabled={eventDays.length === 0 || selectedDays.length === 0}
      >
        Create Link
      </Button>
    </form>
  )

  return (
    <div className="min-h-screen bg-background">
      <Nav userName={session.user.name} userRole={session.user.role} />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Guest Links</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Share schedules with your guests</p>
          </div>

          {/* Mobile: Bottom Sheet */}
          <div className="md:hidden">
            <Sheet
              open={showAddLink}
              onOpenChange={(open) => {
                setShowAddLink(open)
                if (!open) resetForm()
              }}
            >
              <SheetTrigger asChild>
                <Button size="sm" className="rounded-full gap-1.5">
                  <Plus className="h-4 w-4" />
                  Create
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl px-6 pb-8 safe-bottom">
                <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mb-6 mt-2" />
                <SheetHeader className="text-left pb-4">
                  <SheetTitle className="text-xl">Create Guest Link</SheetTitle>
                </SheetHeader>
                <LinkForm />
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop: Dialog */}
          <div className="hidden md:block">
            <Dialog
              open={showAddLink}
              onOpenChange={(open) => {
                setShowAddLink(open)
                if (!open) resetForm()
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 rounded-full">
                  <Plus className="h-4 w-4" />
                  Create Link
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Guest Link</DialogTitle>
                </DialogHeader>
                <div className="pt-4">
                  <LinkForm />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {links.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Link2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                No guest links created yet. Create a link to share schedules with your guests.
              </p>
              <Button onClick={() => setShowAddLink(true)} className="rounded-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Guest Link
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <Card key={link.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Link2 className="h-5 w-5 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold">{link.label}</h3>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(link.createdAt).toLocaleDateString()}
                            </span>
                            {link.expiresAt && (
                              <span className="text-amber-600">
                                Expires {new Date(link.expiresAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 rounded-full"
                            onClick={() => copyLink(link)}
                          >
                            {copiedId === link.id ? (
                              <>
                                <Check className="h-4 w-4 text-green-600" />
                                <span className="hidden sm:inline">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4" />
                                <span className="hidden sm:inline">Copy</span>
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive rounded-full"
                            onClick={() => handleDelete(link.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Days included */}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="text-xs text-muted-foreground">Days:</span>
                        {link.allowedEventDays.map((aed) => (
                          <Badge key={aed.eventDay.id} variant="secondary" className="text-xs rounded-full">
                            {aed.eventDay.label}
                          </Badge>
                        ))}
                      </div>

                      {/* Link preview */}
                      <div className="mt-3 p-2.5 bg-muted/50 rounded-xl flex items-center gap-2">
                        <code className="text-xs text-muted-foreground flex-1 truncate">
                          {typeof window !== "undefined" && `${window.location.origin}/guest/${link.token}`}
                        </code>
                        <a
                          href={`/guest/${link.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
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
