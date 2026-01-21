"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Clock, Plus, Minus, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TimeAdjustmentControlProps {
  timelineItemId: string
  timelineItemTitle: string
  eventDayId: string
  onAdjustmentApplied: () => void
}

export function TimeAdjustmentControl({
  timelineItemId,
  timelineItemTitle,
  eventDayId,
  onAdjustmentApplied
}: TimeAdjustmentControlProps) {
  const [open, setOpen] = useState(false)
  const [adjustmentMinutes, setAdjustmentMinutes] = useState<number>(0)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const quickAdjustments = [
    { label: "-30 min", value: -30 },
    { label: "-15 min", value: -15 },
    { label: "+15 min", value: 15 },
    { label: "+30 min", value: 30 },
    { label: "+45 min", value: 45 },
    { label: "+60 min", value: 60 },
  ]

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

      const data = await response.json()

      setOpen(false)
      setAdjustmentMinutes(0)
      setReason("")
      onAdjustmentApplied()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply adjustment. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setAdjustmentMinutes(0)
      setReason("")
      setError("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Clock className="mr-2 h-4 w-4" />
          Adjust Time
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Timeline from This Event</DialogTitle>
          <DialogDescription>
            This will shift &quot;{timelineItemTitle}&quot; and all following events on this day
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              All events starting from this one will be shifted by the selected time
            </AlertDescription>
          </Alert>

          <div>
            <Label>Quick Adjustments</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {quickAdjustments.map((adj) => (
                <Button
                  key={adj.value}
                  variant={adjustmentMinutes === adj.value ? "default" : "outline"}
                  onClick={() => setAdjustmentMinutes(adj.value)}
                  className="w-full"
                  type="button"
                >
                  {adj.value > 0 ? <Plus className="h-3 w-3 mr-1" /> : <Minus className="h-3 w-3 mr-1" />}
                  {adj.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="custom-adjustment">Custom Adjustment (minutes)</Label>
            <Input
              id="custom-adjustment"
              type="number"
              placeholder="Enter minutes (+ or -)"
              value={adjustmentMinutes === 0 ? "" : adjustmentMinutes}
              onChange={(e) => setAdjustmentMinutes(parseInt(e.target.value) || 0)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Positive = delay, Negative = move earlier
            </p>
          </div>

          <div>
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., 'Baraat running late' or 'Ceremony finished early'"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
              rows={2}
            />
          </div>

          {adjustmentMinutes !== 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                {adjustmentMinutes > 0 ? "Delaying" : "Moving earlier"} by{" "}
                <span className="font-bold">{Math.abs(adjustmentMinutes)} minutes</span>
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApplyAdjustment} disabled={loading || adjustmentMinutes === 0}>
            {loading ? "Applying..." : "Apply Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
