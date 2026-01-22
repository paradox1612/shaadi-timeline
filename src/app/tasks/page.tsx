"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Task = {
  id: string
  title: string
  description: string | null
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "ARCHIVED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  visibility: "PRIVATE" | "INTERNAL_TEAM" | "PARENTS" | "VENDORS" | "EVERYONE_INTERNAL"
  dueDate: string | null
  tags: string[]
  eventDay: { id: string; label: string; date: string } | null
  vendor: { id: string; companyName: string; type: string } | null
  createdBy: { id: string; name: string; email: string }
  assignedTo: { id: string; name: string; email: string; role: string } | null
  watchers: { user: { id: string; name: string; email: string } }[]
  _count: { comments: number }
  createdAt: string
}

type EventDay = {
  id: string
  label: string
  date: string
}

type Vendor = {
  id: string
  companyName: string
  type: string
}

type User = {
  id: string
  name: string
  email: string
  role: string
}

const STATUS_LABELS: Record<Task["status"], string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  ARCHIVED: "Archived",
}

const STATUS_COLORS: Record<Task["status"], string> = {
  TODO: "bg-gray-100 text-gray-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  BLOCKED: "bg-red-100 text-red-800",
  DONE: "bg-green-100 text-green-800",
  ARCHIVED: "bg-gray-200 text-gray-600",
}

const PRIORITY_LABELS: Record<Task["priority"], string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
}

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  HIGH: "bg-orange-100 text-orange-800",
  CRITICAL: "bg-red-100 text-red-800",
}

const VISIBILITY_LABELS: Record<Task["visibility"], string> = {
  PRIVATE: "Private",
  INTERNAL_TEAM: "Internal Team",
  PARENTS: "Parents",
  VENDORS: "Vendors",
  EVERYONE_INTERNAL: "Everyone (Internal)",
}

const getErrorMessage = async (res: Response, fallback: string) => {
  const contentType = res.headers.get("content-type") || ""

  if (!contentType.includes("application/json")) {
    return res.statusText || fallback
  }

  const text = await res.text()
  if (!text) return fallback

  try {
    const data = JSON.parse(text) as { error?: string }
    return data.error || fallback
  } catch {
    return fallback
  }
}

export default function TasksPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [eventDays, setEventDays] = useState<EventDay[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeTab, setActiveTab] = useState<Task["status"] | "ALL">("ALL")

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [filterVendor, setFilterVendor] = useState<string>("")
  const [filterEventDay, setFilterEventDay] = useState<string>("")
  const [filterPriority, setFilterPriority] = useState<string>("")

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "TODO" as Task["status"],
    priority: "MEDIUM" as Task["priority"],
    visibility: "INTERNAL_TEAM" as Task["visibility"],
    dueDate: "",
    eventDayId: "",
    vendorId: "",
    assignedToUserId: "",
    tags: "",
  })

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)
      if (filterVendor) params.append("vendorId", filterVendor)
      if (filterEventDay) params.append("eventDayId", filterEventDay)
      if (filterPriority) params.append("priority", filterPriority)

      const res = await fetch(`/api/tasks?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filterVendor, filterEventDay, filterPriority])

  const fetchRelatedData = async () => {
    try {
      const [eventDaysRes, vendorsRes] = await Promise.all([
        fetch("/api/event-days"),
        fetch("/api/vendors"),
      ])

      if (eventDaysRes.ok) {
        const data = await eventDaysRes.json()
        setEventDays(data)
      }

      if (vendorsRes.ok) {
        const data = await vendorsRes.json()
        setVendors(data)
      }
    } catch (error) {
      console.error("Failed to fetch related data:", error)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchRelatedData()
  }, [fetchTasks])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      title: form.title,
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      visibility: form.visibility,
      dueDate: form.dueDate || null,
      eventDayId: form.eventDayId || null,
      vendorId: form.vendorId || null,
      assignedToUserId: form.assignedToUserId || null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
    }

    try {
      const res = await fetch(
        editingTask ? `/api/tasks/${editingTask.id}` : "/api/tasks",
        {
          method: editingTask ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )

      if (res.ok) {
        setDialogOpen(false)
        resetForm()
        fetchTasks()
      } else {
        const message = await getErrorMessage(res, "Failed to save task")
        alert(message)
      }
    } catch (error) {
      console.error("Failed to save task:", error)
      alert("Failed to save task")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return

    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchTasks()
      } else {
        const message = await getErrorMessage(res, "Failed to delete task")
        alert(message)
      }
    } catch (error) {
      console.error("Failed to delete task:", error)
    }
  }

  const handleStatusChange = async (task: Task, newStatus: Task["status"]) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error("Failed to update status:", error)
    }
  }

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      visibility: "INTERNAL_TEAM",
      dueDate: "",
      eventDayId: "",
      vendorId: "",
      assignedToUserId: "",
      tags: "",
    })
    setEditingTask(null)
  }

  const openEditDialog = (task: Task) => {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      visibility: task.visibility,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
      eventDayId: task.eventDay?.id || "",
      vendorId: task.vendor?.id || "",
      assignedToUserId: task.assignedTo?.id || "",
      tags: task.tags.join(", "),
    })
    setDialogOpen(true)
  }

  const filteredTasks =
    activeTab === "ALL"
      ? tasks.filter((t) => t.status !== "ARCHIVED")
      : tasks.filter((t) => t.status === activeTab)

  const groupedByStatus = {
    TODO: tasks.filter((t) => t.status === "TODO"),
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS"),
    BLOCKED: tasks.filter((t) => t.status === "BLOCKED"),
    DONE: tasks.filter((t) => t.status === "DONE"),
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav userName={session.user.name} userRole={session.user.role} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Tasks</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Manage your wedding planning tasks
            </p>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button>+ New Task</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTask ? "Edit Task" : "Create New Task"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) =>
                        setForm({ ...form, status: v as Task["status"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v) =>
                        setForm({ ...form, priority: v as Task["priority"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select
                      value={form.visibility}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          visibility: v as Task["visibility"],
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(VISIBILITY_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) =>
                        setForm({ ...form, dueDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="eventDay">Event Day</Label>
                    <Select
                      value={form.eventDayId}
                      onValueChange={(v) =>
                        setForm({ ...form, eventDayId: v === "none" ? "" : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select event day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {eventDays.map((day) => (
                          <SelectItem key={day.id} value={day.id}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="vendor">Vendor</Label>
                    <Select
                      value={form.vendorId}
                      onValueChange={(v) =>
                        setForm({ ...form, vendorId: v === "none" ? "" : v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="e.g., urgent, venue, catering"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingTask ? "Update" : "Create"} Task
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <Label>Event Day</Label>
                <Select
                  value={filterEventDay}
                  onValueChange={(v) => setFilterEventDay(v === "all" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All event days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All event days</SelectItem>
                    {eventDays.map((day) => (
                      <SelectItem key={day.id} value={day.id}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendor</Label>
                <Select
                  value={filterVendor}
                  onValueChange={(v) => setFilterVendor(v === "all" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All vendors</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={filterPriority}
                  onValueChange={(v) => setFilterPriority(v === "all" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4 w-full overflow-x-auto flex-nowrap justify-start">
            <TabsTrigger value="ALL" className="text-xs sm:text-sm">
              All ({tasks.filter((t) => t.status !== "ARCHIVED").length})
            </TabsTrigger>
            <TabsTrigger value="TODO" className="text-xs sm:text-sm">
              To Do ({groupedByStatus.TODO.length})
            </TabsTrigger>
            <TabsTrigger value="IN_PROGRESS" className="text-xs sm:text-sm whitespace-nowrap">
              In Progress ({groupedByStatus.IN_PROGRESS.length})
            </TabsTrigger>
            <TabsTrigger value="BLOCKED" className="text-xs sm:text-sm">
              Blocked ({groupedByStatus.BLOCKED.length})
            </TabsTrigger>
            <TabsTrigger value="DONE" className="text-xs sm:text-sm">
              Done ({groupedByStatus.DONE.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading tasks...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tasks found. Create your first task to get started!
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-semibold text-base sm:text-lg break-words">
                              {task.title}
                            </h3>
                            <Badge className={`${PRIORITY_COLORS[task.priority]} text-xs`}>
                              {PRIORITY_LABELS[task.priority]}
                            </Badge>
                            <Badge className={`${STATUS_COLORS[task.status]} text-xs sm:hidden`}>
                              {STATUS_LABELS[task.status]}
                            </Badge>
                          </div>

                          {task.description && (
                            <p className="text-gray-600 mb-3 text-sm sm:text-base">
                              {task.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-500">
                            {task.dueDate && (
                              <span>
                                Due:{" "}
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                            {task.eventDay && (
                              <span>Event: {task.eventDay.label}</span>
                            )}
                            {task.vendor && (
                              <span>Vendor: {task.vendor.companyName}</span>
                            )}
                            {task.assignedTo && (
                              <span>Assigned: {task.assignedTo.name}</span>
                            )}
                            {task._count.comments > 0 && (
                              <span>{task._count.comments} comments</span>
                            )}
                          </div>

                          {task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {task.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                          <Select
                            value={task.status}
                            onValueChange={(v) =>
                              handleStatusChange(task, v as Task["status"])
                            }
                          >
                            <SelectTrigger className="w-full sm:w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_LABELS).map(
                                ([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                )
                              )}
                            </SelectContent>
                          </Select>

                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none"
                              onClick={() => openEditDialog(task)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1 sm:flex-none"
                              onClick={() => handleDelete(task.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
