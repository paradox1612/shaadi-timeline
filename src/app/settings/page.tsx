"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Nav } from "@/components/nav"
import { useSession } from "next-auth/react"

interface Wedding {
  id: string
  name: string
  locationCity: string
  timezone: string
  startDate: string
  endDate: string
}

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
  { value: "Europe/London", label: "British Time (GMT/BST)" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST)" },
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const [wedding, setWedding] = useState<Wedding | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  // Form state
  const [formName, setFormName] = useState("")
  const [formLocationCity, setFormLocationCity] = useState("")
  const [formTimezone, setFormTimezone] = useState("America/Chicago")
  const [formStartDate, setFormStartDate] = useState("")
  const [formEndDate, setFormEndDate] = useState("")

  useEffect(() => {
    fetch("/api/wedding")
      .then((res) => {
        if (res.status === 404) return null
        return res.json()
      })
      .then((data) => {
        if (data && !data.error) {
          setWedding(data)
          setFormName(data.name)
          setFormLocationCity(data.locationCity)
          setFormTimezone(data.timezone)
          setFormStartDate(data.startDate.split("T")[0])
          setFormEndDate(data.endDate.split("T")[0])
        }
        setLoading(false)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage("")

    const res = await fetch("/api/wedding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        locationCity: formLocationCity,
        timezone: formTimezone,
        startDate: new Date(formStartDate).toISOString(),
        endDate: new Date(formEndDate).toISOString(),
      }),
    })

    if (res.ok) {
      const updated = await res.json()
      setWedding(updated)
      setMessage("Settings saved successfully!")
    } else {
      setMessage("Failed to save settings")
    }
    setSaving(false)
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

      <div className="container mx-auto p-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Wedding Settings</h1>
          <p className="text-muted-foreground">Configure your wedding details</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Wedding Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="weddingName">Wedding Name</Label>
                <Input
                  id="weddingName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Freya & Kush's Wedding"
                  required
                />
              </div>
              <div>
                <Label htmlFor="locationCity">Location/City</Label>
                <Input
                  id="locationCity"
                  value={formLocationCity}
                  onChange={(e) => setFormLocationCity(e.target.value)}
                  placeholder="e.g., Houston, TX"
                  required
                />
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={formTimezone} onValueChange={setFormTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              {message && (
                <p
                  className={`text-sm ${
                    message.includes("success") ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {message}
                </p>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
