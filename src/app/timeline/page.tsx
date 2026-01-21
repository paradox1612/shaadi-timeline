"use client"

import { useEffect, useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { TimeAdjustmentControl } from "@/components/timeline/TimeAdjustmentControl"
import { AdjustmentHistory } from "@/components/timeline/AdjustmentHistory"

interface EventDay {
  id: string
  date: string
  label: string
  sortOrder: number
  _count: { timelineItems: number }
}

interface Vendor {
  id: string
  companyName: string
  type: string
}

interface TimelineItem {
  id: string
  startTime: string
  endTime: string | null
  title: string
  description: string | null
  locationName: string | null
  visibility: "INTERNAL" | "VENDOR" | "AUDIENCE"
  internalNotes: string | null
  vendorNotes: string | null
  audienceNotes: string | null
  sortOrder: number
  eventDayId: string
  assignedVendors: { vendor: Vendor }[]
}

export default function TimelinePage() {
  const { data: session } = useSession()
  const [eventDays, setEventDays] = useState<EventDay[]>([])
  const [activeDay, setActiveDay] = useState<string>("")
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddDay, setShowAddDay] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Form state
  const [newDayLabel, setNewDayLabel] = useState("")
  const [newDayDate, setNewDayDate] = useState("")
  const [newItemTitle, setNewItemTitle] = useState("")
  const [newItemStartTime, setNewItemStartTime] = useState("")
  const [newItemEndTime, setNewItemEndTime] = useState("")
  const [newItemLocation, setNewItemLocation] = useState("")
  const [newItemVisibility, setNewItemVisibility] = useState<"INTERNAL" | "VENDOR" | "AUDIENCE">("INTERNAL")
  const [newItemDescription, setNewItemDescription] = useState("")
  const [newItemVendorNotes, setNewItemVendorNotes] = useState("")
  const [newItemAudienceNotes, setNewItemAudienceNotes] = useState("")
  const [selectedVendors, setSelectedVendors] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      fetch("/api/event-days").then((res) => res.json()),
      fetch("/api/vendors").then((res) => res.json()),
    ]).then(([days, vendorList]) => {
      setEventDays(days)
      setVendors(Array.isArray(vendorList) ? vendorList : [])
      if (days.length > 0) {
        setActiveDay(days[0].id)
      }
      setLoading(false)
    })
  }, [])

  const fetchTimelineItems = useCallback(() => {
    if (activeDay) {
      fetch(`/api/timeline-items?eventDayId=${activeDay}`)
        .then((res) => res.json())
        .then((items) => setTimelineItems(items))
    }
  }, [activeDay])

  useEffect(() => {
    fetchTimelineItems()
  }, [fetchTimelineItems, refreshKey])

  const handleTimelineRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleAddDay = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch("/api/event-days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newDayLabel,
        date: newDayDate,
        sortOrder: eventDays.length,
      }),
    })
    if (res.ok) {
      const newDay = await res.json()
      setEventDays([...eventDays, newDay])
      setShowAddDay(false)
      setNewDayLabel("")
      setNewDayDate("")
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch("/api/timeline-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventDayId: activeDay,
        title: newItemTitle,
        startTime: newItemStartTime,
        endTime: newItemEndTime || null,
        locationName: newItemLocation || null,
        visibility: newItemVisibility,
        description: newItemDescription || null,
        vendorNotes: newItemVendorNotes || null,
        audienceNotes: newItemAudienceNotes || null,
        assignedVendorIds: selectedVendors,
        sortOrder: timelineItems.length,
      }),
    })
    if (res.ok) {
      const newItem = await res.json()
      setTimelineItems([...timelineItems, newItem])
      setShowAddItem(false)
      resetItemForm()
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return
    const res = await fetch(`/api/timeline-items/${itemId}`, {
      method: "DELETE",
    })
    if (res.ok) {
      setTimelineItems(timelineItems.filter((item) => item.id !== itemId))
    }
  }

  const resetItemForm = () => {
    setNewItemTitle("")
    setNewItemStartTime("")
    setNewItemEndTime("")
    setNewItemLocation("")
    setNewItemVisibility("INTERNAL")
    setNewItemDescription("")
    setNewItemVendorNotes("")
    setNewItemAudienceNotes("")
    setSelectedVendors([])
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
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
      <Nav userName={session.user.name} userRole={session.user.role} />

      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Wedding Timeline</h1>
          <Dialog open={showAddDay} onOpenChange={setShowAddDay}>
            <DialogTrigger asChild>
              <Button>+ Add Event Day</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Event Day</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddDay} className="space-y-4">
                <div>
                  <Label htmlFor="dayLabel">Day Name</Label>
                  <Input
                    id="dayLabel"
                    value={newDayLabel}
                    onChange={(e) => setNewDayLabel(e.target.value)}
                    placeholder="e.g., Mehendi, Sangeet, Wedding"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dayDate">Date</Label>
                  <Input
                    id="dayDate"
                    type="date"
                    value={newDayDate}
                    onChange={(e) => setNewDayDate(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">Add Day</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {eventDays.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground mb-4">
                No event days yet. Add your first event day to get started.
              </p>
              <Button onClick={() => setShowAddDay(true)}>Add Event Day</Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeDay} onValueChange={setActiveDay} className="w-full">
            <TabsList className="mb-4">
              {eventDays.map((day) => (
                <TabsTrigger key={day.id} value={day.id}>
                  {day.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {eventDays.map((day) => (
              <TabsContent key={day.id} value={day.id}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{day.label}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
                      <DialogTrigger asChild>
                        <Button size="sm">+ Add Item</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Add Timeline Item</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddItem} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <Label htmlFor="itemTitle">Title</Label>
                              <Input
                                id="itemTitle"
                                value={newItemTitle}
                                onChange={(e) => setNewItemTitle(e.target.value)}
                                placeholder="e.g., Bride Getting Ready"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="startTime">Start Time</Label>
                              <Input
                                id="startTime"
                                type="datetime-local"
                                value={newItemStartTime}
                                onChange={(e) => setNewItemStartTime(e.target.value)}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="endTime">End Time (optional)</Label>
                              <Input
                                id="endTime"
                                type="datetime-local"
                                value={newItemEndTime}
                                onChange={(e) => setNewItemEndTime(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="location">Location</Label>
                              <Input
                                id="location"
                                value={newItemLocation}
                                onChange={(e) => setNewItemLocation(e.target.value)}
                                placeholder="e.g., Bridal Suite"
                              />
                            </div>
                            <div>
                              <Label htmlFor="visibility">Visibility</Label>
                              <Select
                                value={newItemVisibility}
                                onValueChange={(v) => setNewItemVisibility(v as typeof newItemVisibility)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="INTERNAL">Internal Only</SelectItem>
                                  <SelectItem value="VENDOR">Vendors</SelectItem>
                                  <SelectItem value="AUDIENCE">Guests (Public)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                value={newItemDescription}
                                onChange={(e) => setNewItemDescription(e.target.value)}
                                placeholder="Internal notes about this event..."
                              />
                            </div>
                            {newItemVisibility !== "INTERNAL" && (
                              <div className="col-span-2">
                                <Label htmlFor="vendorNotes">Vendor Notes</Label>
                                <Textarea
                                  id="vendorNotes"
                                  value={newItemVendorNotes}
                                  onChange={(e) => setNewItemVendorNotes(e.target.value)}
                                  placeholder="Notes visible to assigned vendors..."
                                />
                              </div>
                            )}
                            {newItemVisibility === "AUDIENCE" && (
                              <div className="col-span-2">
                                <Label htmlFor="audienceNotes">Guest Notes</Label>
                                <Textarea
                                  id="audienceNotes"
                                  value={newItemAudienceNotes}
                                  onChange={(e) => setNewItemAudienceNotes(e.target.value)}
                                  placeholder="Notes visible to guests..."
                                />
                              </div>
                            )}
                            {vendors.length > 0 && (
                              <div className="col-span-2">
                                <Label>Assign Vendors</Label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {vendors.map((vendor) => (
                                    <Badge
                                      key={vendor.id}
                                      variant={selectedVendors.includes(vendor.id) ? "default" : "outline"}
                                      className="cursor-pointer"
                                      onClick={() => {
                                        if (selectedVendors.includes(vendor.id)) {
                                          setSelectedVendors(selectedVendors.filter((v) => v !== vendor.id))
                                        } else {
                                          setSelectedVendors([...selectedVendors, vendor.id])
                                        }
                                      }}
                                    >
                                      {vendor.companyName}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button type="submit">Add Item</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    {timelineItems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No timeline items for this day yet.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {timelineItems.map((item) => (
                          <div
                            key={item.id}
                            className="border-l-4 border-pink-500 pl-4 py-3 hover:bg-gray-50 rounded-r"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold">{item.title}</h3>
                                  <Badge
                                    variant={
                                      item.visibility === "AUDIENCE"
                                        ? "default"
                                        : item.visibility === "VENDOR"
                                        ? "secondary"
                                        : "outline"
                                    }
                                  >
                                    {item.visibility}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {formatTime(item.startTime)}
                                  {item.endTime && ` - ${formatTime(item.endTime)}`}
                                  {item.locationName && ` • ${item.locationName}`}
                                </p>
                                {item.assignedVendors.length > 0 && (
                                  <div className="flex gap-1 mt-2">
                                    {item.assignedVendors.map((av) => (
                                      <Badge key={av.vendor.id} variant="outline" className="text-xs">
                                        {av.vendor.companyName}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <TimeAdjustmentControl
                                  timelineItemId={item.id}
                                  timelineItemTitle={item.title}
                                  eventDayId={activeDay}
                                  onAdjustmentApplied={handleTimelineRefresh}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => handleDeleteItem(item.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Adjustment History */}
                <div className="mt-6">
                  <AdjustmentHistory
                    eventDayId={day.id}
                    onRefresh={handleTimelineRefresh}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  )
}
