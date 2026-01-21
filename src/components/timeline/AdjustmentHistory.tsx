"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { History, Undo2, Clock } from "lucide-react"

interface Adjustment {
  id: string
  adjustmentMinutes: number
  reason: string | null
  appliedAt: string
  appliedBy: {
    name: string
    role: string
  }
  fromItem: {
    title: string
  }
}

interface AdjustmentHistoryProps {
  eventDayId: string
  onRefresh?: () => void
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
}

export function AdjustmentHistory({ eventDayId, onRefresh }: AdjustmentHistoryProps) {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [loading, setLoading] = useState(false)
  const [undoing, setUndoing] = useState(false)

  const fetchAdjustments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/timeline-adjustments?eventDayId=${eventDayId}`)
      if (response.ok) {
        const data = await response.json()
        setAdjustments(data)
      }
    } catch (error) {
      console.error("Failed to fetch adjustments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUndo = async () => {
    if (!confirm("Undo the last time adjustment? This will revert all affected events.")) {
      return
    }

    setUndoing(true)
    try {
      const response = await fetch("/api/timeline-adjustments/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventDayId })
      })

      if (response.ok) {
        await fetchAdjustments()
        onRefresh?.()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to undo adjustment")
      }
    } catch (error) {
      alert("Failed to undo adjustment")
    } finally {
      setUndoing(false)
    }
  }

  useEffect(() => {
    fetchAdjustments()
  }, [eventDayId])

  if (adjustments.length === 0 && !loading) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <History className="mr-2 h-4 w-4" />
            Time Adjustments History
          </CardTitle>
          {adjustments.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={undoing}
            >
              <Undo2 className="mr-2 h-3 w-3" />
              {undoing ? "Undoing..." : "Undo Last"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-3">
              {adjustments.map((adj, index) => (
                <div
                  key={adj.id}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium">
                        {adj.adjustmentMinutes > 0 ? "+" : ""}
                        {adj.adjustmentMinutes} min
                      </span>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs">Latest</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      From: <span className="font-medium">{adj.fromItem.title}</span>
                    </p>
                    {adj.reason && (
                      <p className="text-sm text-muted-foreground italic mt-1">
                        &quot;{adj.reason}&quot;
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      By {adj.appliedBy.name} &bull;{" "}
                      {formatTimeAgo(adj.appliedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
