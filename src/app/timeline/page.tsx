"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
import { TimeAdjustmentControl } from "@/components/timeline/TimeAdjustmentControl"
import { AdjustmentHistory } from "@/components/timeline/AdjustmentHistory"
import { cn } from "@/lib/utils"
import {
  Plus,
  MapPin,
  Clock,
  Trash2,
  CalendarDays,
  ChevronRight,
  Users,
  X,
  Pencil,
} from "lucide-react"

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

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function SwipeableTimelineItem({
  item,
  eventDayId,
  onAdjustmentApplied,
  onDelete,
}: {
  item: TimelineItem
  eventDayId: string
  onAdjustmentApplied: () => void
  onDelete: (itemId: string) => void
}) {
  const actionWidth = 140
  const quickWidth = 220
  const [offset, setOffset] = useState(0)
  const [openSide, setOpenSide] = useState<"left" | "right" | null>(null)
  const [applyingAdjustment, setApplyingAdjustment] = useState(false)
  const startRef = useRef<{ x: number; y: number; offset: number; dragging: boolean } | null>(null)

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      offset,
      dragging: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return
    const dx = startRef.current.x - e.clientX
    const dy = Math.abs(startRef.current.y - e.clientY)

    if (!startRef.current.dragging) {
      if (Math.abs(dx) < 6) return
      if (dy > Math.abs(dx)) return
      startRef.current.dragging = true
    }

    const nextOffset = clamp(startRef.current.offset + dx, -quickWidth, actionWidth)
    setOffset(nextOffset)
  }

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return
    const wasDragging = startRef.current.dragging
    const shouldOpenRight = offset > actionWidth * 0.5
    const shouldOpenLeft = offset < -quickWidth * 0.4
    if (shouldOpenRight) {
      setOpenSide("right")
      setOffset(actionWidth)
    } else if (shouldOpenLeft) {
      setOpenSide("left")
      setOffset(-quickWidth)
    } else {
      setOpenSide(null)
      setOffset(0)
    }
    startRef.current = null
    e.currentTarget.releasePointerCapture(e.pointerId)

    if (!wasDragging && openSide) {
      setOpenSide(null)
      setOffset(0)
    }
  }

  const applyQuickAdjustment = async (minutes: number) => {
    if (applyingAdjustment) return
    setApplyingAdjustment(true)
    try {
      const response = await fetch("/api/timeline-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventDayId,
          fromItemId: item.id,
          adjustmentMinutes: minutes,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to apply adjustment")
      }
      setOpenSide(null)
      setOffset(0)
      onAdjustmentApplied()
    } catch (err) {
      console.error(err)
    } finally {
      setApplyingAdjustment(false)
    }
  }

  return (
    <div className="relative">
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-start px-3 bg-muted/80 rounded-2xl"
        style={{ width: quickWidth }}
      >
        <div className="grid grid-cols-2 gap-2">
          {[
            { val: -30, label: "-30", tone: "bg-sky-200 text-sky-900" },
            { val: -15, label: "-15", tone: "bg-blue-200 text-blue-900" },
            { val: 15, label: "+15", tone: "bg-amber-200 text-amber-900" },
            { val: 30, label: "+30", tone: "bg-orange-200 text-orange-900" },
          ].map((tile) => (
            <button
              key={tile.val}
              type="button"
              onClick={() => applyQuickAdjustment(tile.val)}
              disabled={applyingAdjustment}
              className={cn(
                "h-12 w-16 rounded-xl text-sm font-semibold shadow-sm transition-transform",
                "active:scale-95 disabled:opacity-60",
                tile.tone
              )}
            >
              {tile.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 px-3 bg-muted/80 rounded-2xl"
        style={{ width: actionWidth }}
      >
        <TimeAdjustmentControl
          timelineItemId={item.id}
          timelineItemTitle={item.title}
          eventDayId={eventDayId}
          onAdjustmentApplied={onAdjustmentApplied}
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive rounded-full"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div
        className="transition-transform duration-200 touch-pan-y"
        style={{ transform: `translateX(${-offset}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <Card
          className={cn(
            "overflow-hidden transition-all duration-200 hover:shadow-md",
            "border-l-4 border-l-primary"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Time Column */}
              <div className="flex-shrink-0 text-center min-w-[60px]">
                <div className="text-lg font-semibold text-primary">
                  {formatTime(item.startTime)}
                </div>
                {item.endTime && (
                  <div className="text-xs text-muted-foreground">
                    to {formatTime(item.endTime)}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base leading-tight">
                      {item.title}
                    </h3>

                    {/* Location */}
                    {item.locationName && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{item.locationName}</span>
                      </div>
                    )}

                    {/* Badges row */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge
                        variant={
                          item.visibility === "AUDIENCE"
                            ? "default"
                            : item.visibility === "VENDOR"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs rounded-full"
                      >
                        {item.visibility === "AUDIENCE"
                          ? "Guests"
                          : item.visibility === "VENDOR"
                          ? "Vendors"
                          : "Internal"}
                      </Badge>

                      {item.assignedVendors.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{item.assignedVendors.length} vendor{item.assignedVendors.length > 1 ? "s" : ""}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions (desktop) */}
                  <div className="hidden md:flex items-center gap-1 flex-shrink-0">
                    <TimeAdjustmentControl
                      timelineItemId={item.id}
                      timelineItemTitle={item.title}
                      eventDayId={eventDayId}
                      onAdjustmentApplied={onAdjustmentApplied}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive rounded-full"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
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
  const [editMode, setEditMode] = useState(false)

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

  const handleDeleteDay = async (dayId: string) => {
    const day = eventDays.find((d) => d.id === dayId)
    if (!day) return

    const itemCount = day._count?.timelineItems || 0
    const message = itemCount > 0
      ? `Are you sure you want to delete "${day.label}"? This will also delete ${itemCount} timeline item${itemCount > 1 ? "s" : ""}.`
      : `Are you sure you want to delete "${day.label}"?`

    if (!confirm(message)) return

    const res = await fetch(`/api/event-days/${dayId}`, {
      method: "DELETE",
    })
    if (res.ok) {
      const updatedDays = eventDays.filter((d) => d.id !== dayId)
      setEventDays(updatedDays)
      if (activeDay === dayId && updatedDays.length > 0) {
        setActiveDay(updatedDays[0].id)
      } else if (updatedDays.length === 0) {
        setActiveDay("")
        setTimelineItems([])
      }
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

  const activeEventDay = eventDays.find((d) => d.id === activeDay)

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  // Add Item Form Component (shared between mobile sheet and desktop dialog)
  const AddItemForm = () => (
    <form onSubmit={handleAddItem} className="space-y-5">
      <div>
        <Label htmlFor="itemTitle" className="text-sm font-medium">Event Title</Label>
        <Input
          id="itemTitle"
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          placeholder="e.g., Bride Getting Ready"
          className="mt-1.5 h-12 rounded-xl"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="startTime" className="text-sm font-medium">Start Time</Label>
          <Input
            id="startTime"
            type="datetime-local"
            value={newItemStartTime}
            onChange={(e) => setNewItemStartTime(e.target.value)}
            className="mt-1.5 h-12 rounded-xl"
            required
          />
        </div>
        <div>
          <Label htmlFor="endTime" className="text-sm font-medium">End Time</Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={newItemEndTime}
            onChange={(e) => setNewItemEndTime(e.target.value)}
            className="mt-1.5 h-12 rounded-xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="location" className="text-sm font-medium">Location</Label>
          <Input
            id="location"
            value={newItemLocation}
            onChange={(e) => setNewItemLocation(e.target.value)}
            placeholder="e.g., Bridal Suite"
            className="mt-1.5 h-12 rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor="visibility" className="text-sm font-medium">Visibility</Label>
          <Select
            value={newItemVisibility}
            onValueChange={(v) => setNewItemVisibility(v as typeof newItemVisibility)}
          >
            <SelectTrigger className="mt-1.5 h-12 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INTERNAL">Internal Only</SelectItem>
              <SelectItem value="VENDOR">Vendors</SelectItem>
              <SelectItem value="AUDIENCE">Guests (Public)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description" className="text-sm font-medium">Description</Label>
        <Textarea
          id="description"
          value={newItemDescription}
          onChange={(e) => setNewItemDescription(e.target.value)}
          placeholder="Internal notes about this event..."
          className="mt-1.5 rounded-xl resize-none"
          rows={2}
        />
      </div>

      {newItemVisibility !== "INTERNAL" && (
        <div>
          <Label htmlFor="vendorNotes" className="text-sm font-medium">Vendor Notes</Label>
          <Textarea
            id="vendorNotes"
            value={newItemVendorNotes}
            onChange={(e) => setNewItemVendorNotes(e.target.value)}
            placeholder="Notes visible to assigned vendors..."
            className="mt-1.5 rounded-xl resize-none"
            rows={2}
          />
        </div>
      )}

      {newItemVisibility === "AUDIENCE" && (
        <div>
          <Label htmlFor="audienceNotes" className="text-sm font-medium">Guest Notes</Label>
          <Textarea
            id="audienceNotes"
            value={newItemAudienceNotes}
            onChange={(e) => setNewItemAudienceNotes(e.target.value)}
            placeholder="Notes visible to guests..."
            className="mt-1.5 rounded-xl resize-none"
            rows={2}
          />
        </div>
      )}

      {vendors.length > 0 && (
        <div>
          <Label className="text-sm font-medium">Assign Vendors</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {vendors.map((vendor) => (
              <Badge
                key={vendor.id}
                variant={selectedVendors.includes(vendor.id) ? "default" : "outline"}
                className={cn(
                  "cursor-pointer py-2 px-3 rounded-full transition-all",
                  selectedVendors.includes(vendor.id) && "shadow-sm"
                )}
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

      <Button type="submit" className="w-full h-12 rounded-xl mt-4">
        Add Event
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
            <h1 className="text-2xl md:text-3xl font-bold">Timeline</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your wedding schedule</p>
          </div>
          <Dialog open={showAddDay} onOpenChange={setShowAddDay}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Add Day</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Event Day</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddDay} className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="dayLabel">Day Name</Label>
                  <Input
                    id="dayLabel"
                    value={newDayLabel}
                    onChange={(e) => setNewDayLabel(e.target.value)}
                    placeholder="e.g., Mehendi, Sangeet, Wedding"
                    className="mt-1.5 h-12 rounded-xl"
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
                    className="mt-1.5 h-12 rounded-xl"
                    required
                  />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full h-12 rounded-xl">Add Day</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {eventDays.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                No event days yet. Add your first day to get started.
              </p>
              <Button onClick={() => setShowAddDay(true)} className="rounded-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Event Day
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Horizontal scrollable day tabs - Mobile friendly */}
            <div className="relative mb-6">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                    editMode
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {editMode ? "Done" : "Edit"}
                </button>
                {editMode && (
                  <span className="text-xs text-muted-foreground animate-in fade-in">
                    Tap the × to remove a day
                  </span>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                {eventDays.map((day) => (
                  <div key={day.id} className="relative flex-shrink-0">
                    <button
                      onClick={() => !editMode && setActiveDay(day.id)}
                      className={cn(
                        "px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200",
                        "min-w-[100px] text-center",
                        activeDay === day.id
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted",
                        editMode && "animate-wiggle"
                      )}
                    >
                      <div className="font-semibold">{day.label}</div>
                      <div className="text-xs opacity-80 mt-0.5">{formatDate(day.date)}</div>
                    </button>
                    {editMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDay(day.id)
                        }}
                        className={cn(
                          "absolute -top-2 -right-2 h-6 w-6 rounded-full flex items-center justify-center",
                          "bg-destructive text-destructive-foreground",
                          "hover:scale-110 active:scale-95 transition-transform",
                          "shadow-md animate-in zoom-in duration-200"
                        )}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Active Day Content */}
            {activeEventDay && (
              <div className="space-y-4">
                {/* Day Header Card */}
                <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">{activeEventDay.label}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(activeEventDay.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      {/* Mobile: Bottom Sheet for Add Item */}
                      <div className="md:hidden">
                        <Sheet open={showAddItem} onOpenChange={setShowAddItem}>
                          <SheetTrigger asChild>
                            <Button size="sm" className="rounded-full gap-1.5">
                              <Plus className="h-4 w-4" />
                              Add
                            </Button>
                          </SheetTrigger>
                          <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl px-6 pb-8 overflow-y-auto safe-bottom">
                            <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mb-6 mt-2" />
                            <SheetHeader className="text-left pb-4">
                              <SheetTitle className="text-xl">Add Timeline Event</SheetTitle>
                            </SheetHeader>
                            <AddItemForm />
                          </SheetContent>
                        </Sheet>
                      </div>

                      {/* Desktop: Dialog for Add Item */}
                      <div className="hidden md:block">
                        <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="gap-2 rounded-full">
                              <Plus className="h-4 w-4" />
                              Add Event
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Add Timeline Event</DialogTitle>
                            </DialogHeader>
                            <div className="pt-4">
                              <AddItemForm />
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Timeline Items */}
                {timelineItems.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">
                        No events scheduled for this day yet.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {timelineItems.map((item, index) => (
                      <div key={item.id} style={{ animationDelay: `${index * 50}ms` }}>
                        <SwipeableTimelineItem
                          item={item}
                          eventDayId={activeDay}
                          onAdjustmentApplied={handleTimelineRefresh}
                          onDelete={handleDeleteItem}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Adjustment History */}
                <div className="mt-8">
                  <AdjustmentHistory
                    eventDayId={activeDay}
                    onRefresh={handleTimelineRefresh}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
