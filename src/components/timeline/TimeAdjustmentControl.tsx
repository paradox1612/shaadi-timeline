"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Clock, AlertCircle, Minus, Plus } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface TimeAdjustmentControlProps {
  timelineItemId: string
  timelineItemTitle: string
  eventDayId: string
  onAdjustmentApplied: () => void
}

function TimeAdjustmentForm({
  timelineItemTitle,
  eventDayId,
  timelineItemId,
  onAdjustmentApplied,
  onClose,
}: TimeAdjustmentControlProps & { onClose: () => void }) {
  const [adjustmentMinutes, setAdjustmentMinutes] = useState<number>(0)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const minValue = -60
  const maxValue = 120
  const percentage = ((adjustmentMinutes - minValue) / (maxValue - minValue)) * 100
  const knobPosition = Math.min(Math.max(percentage, 2), 98)
  const zeroPosition = ((0 - minValue) / (maxValue - minValue)) * 100

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    // Snap to 5-minute increments
    const snapped = Math.round(value / 5) * 5
    setAdjustmentMinutes(snapped)
  }, [])

  const incrementValue = useCallback((amount: number) => {
    setAdjustmentMinutes(prev => {
      const newVal = prev + amount
      return Math.min(Math.max(newVal, minValue), maxValue)
    })
  }, [])

  const handleApplyAdjustment = async () => {
    if (adjustmentMinutes === 0) {
      setError("Please select a time adjustment")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/timeline-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventDayId,
          fromItemId: timelineItemId,
          adjustmentMinutes,
          reason: reason || undefined
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to apply adjustment")
      }

      onClose()
      onAdjustmentApplied()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply adjustment")
    } finally {
      setLoading(false)
    }
  }

  const formatAdjustment = (mins: number) => {
    const absMinutes = Math.abs(mins)
    const hours = Math.floor(absMinutes / 60)
    const minutes = absMinutes % 60

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${minutes}m`
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Alert className="bg-amber-50 border-amber-200 text-amber-800">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          All events from this one onwards will be shifted
        </AlertDescription>
      </Alert>

      {/* Visual Time Display */}
      <div className="text-center">
        <div className={cn(
          "text-5xl md:text-6xl font-light tabular-nums transition-colors duration-200",
          adjustmentMinutes > 0 && "text-amber-600",
          adjustmentMinutes < 0 && "text-blue-600",
          adjustmentMinutes === 0 && "text-muted-foreground"
        )}>
          {adjustmentMinutes > 0 ? "+" : adjustmentMinutes < 0 ? "-" : ""}{formatAdjustment(adjustmentMinutes)}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {adjustmentMinutes > 0 ? "Delay" : adjustmentMinutes < 0 ? "Earlier" : "No change"}
        </p>
      </div>

      {/* Left to right time shift rail */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Earlier</span>
          <span>On time</span>
          <span>Later</span>
        </div>
        <div className="relative">
          <div className="relative h-16 rounded-2xl border border-border overflow-hidden bg-muted shadow-inner">
            <div className="absolute inset-0 flex">
              <div className="flex-1 bg-sky-200/80" />
              <div className="flex-1 bg-emerald-100/80" />
              <div className="flex-1 bg-amber-100/80" />
              <div className="flex-1 bg-orange-200/80" />
              <div className="flex-1 bg-amber-300/80" />
            </div>
            <div
              className="absolute inset-y-2 w-0.5 bg-white/70"
              style={{ left: `${zeroPosition}%` }}
            />
            <div className="absolute inset-x-4 bottom-2 flex items-center justify-between text-[10px] font-semibold text-muted-foreground/80">
              <span>-60m</span>
              <span>0</span>
              <span>+120m</span>
            </div>
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${knobPosition}%` }}
          >
            <div className={cn(
              "h-12 w-12 rounded-full border bg-card shadow-lg flex items-center justify-center text-xs font-semibold tabular-nums",
              adjustmentMinutes > 0 && "text-amber-700 border-amber-200",
              adjustmentMinutes < 0 && "text-blue-700 border-blue-200",
              adjustmentMinutes === 0 && "text-muted-foreground"
            )}>
              {adjustmentMinutes > 0 ? `+${adjustmentMinutes}` : adjustmentMinutes}
            </div>
          </div>
          <input
            type="range"
            min={minValue}
            max={maxValue}
            step={5}
            value={adjustmentMinutes}
            onChange={handleSliderChange}
            className="absolute inset-0 w-full h-16 opacity-0 cursor-pointer touch-pan-x"
            aria-label="Adjust time in minutes"
          />
        </div>
      </div>

      {/* Quick adjustment buttons */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full"
          onClick={() => incrementValue(-15)}
          disabled={adjustmentMinutes <= minValue}
        >
          <Minus className="h-4 w-4" />
        </Button>
        {[-30, -15, 15, 30].map((val) => (
          <Button
            key={val}
            variant={adjustmentMinutes === val ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-10 px-3 rounded-full text-sm font-medium transition-all",
              adjustmentMinutes === val && "shadow-md"
            )}
            onClick={() => setAdjustmentMinutes(val)}
          >
            {val > 0 ? `+${val}` : val}
          </Button>
        ))}
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-full"
          onClick={() => incrementValue(15)}
          disabled={adjustmentMinutes >= maxValue}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Reason input */}
      <div className="space-y-2">
        <Label htmlFor="reason" className="text-sm font-medium">
          Reason (optional)
        </Label>
        <Textarea
          id="reason"
          placeholder="e.g., Baraat running late"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="flex-1 h-12 rounded-xl"
        >
          Cancel
        </Button>
        <Button
          onClick={handleApplyAdjustment}
          disabled={loading || adjustmentMinutes === 0}
          className="flex-1 h-12 rounded-xl"
        >
          {loading ? "Applying..." : "Apply"}
        </Button>
      </div>
    </div>
  )
}

export function TimeAdjustmentControl(props: TimeAdjustmentControlProps) {
  const [open, setOpen] = useState(false)
  const { timelineItemTitle } = props

  // Use Sheet for mobile, Dialog for desktop
  return (
    <>
      {/* Mobile: Bottom Sheet */}
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-9 px-3 rounded-full">
              <Clock className="h-4 w-4" />
              <span className="sr-only">Adjust time</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-3xl px-6 pb-8 safe-bottom">
            <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mb-6 mt-2" />
            <SheetHeader className="text-left pb-4">
              <SheetTitle className="text-xl">Adjust Time</SheetTitle>
              <SheetDescription className="text-base">
                Shift &quot;{timelineItemTitle}&quot; and following events
              </SheetDescription>
            </SheetHeader>
            <TimeAdjustmentForm {...props} onClose={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Dialog */}
      <div className="hidden md:block">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Clock className="h-4 w-4" />
              Adjust Time
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adjust Timeline</DialogTitle>
              <DialogDescription>
                Shift &quot;{timelineItemTitle}&quot; and all following events
              </DialogDescription>
            </DialogHeader>
            <TimeAdjustmentForm {...props} onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
