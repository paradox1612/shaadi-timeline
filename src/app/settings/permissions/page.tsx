"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type PermissionsData = {
  permissions: Record<string, Record<string, boolean>>
  defaults: Record<string, Record<string, boolean>>
  canEdit: boolean
}

const ROLES = [
  { value: "PLANNER", label: "Wedding Planner" },
  { value: "BRIDE_PARENT", label: "Bride's Parents" },
  { value: "GROOM_PARENT", label: "Groom's Parents" },
  { value: "FAMILY_HELPER", label: "Family Helper" },
  { value: "VENDOR", label: "Vendor" },
]

const CAPABILITY_GROUPS = [
  {
    title: "Tasks",
    capabilities: [
      { key: "tasks.create", label: "Create tasks", description: "Can create new tasks" },
      { key: "tasks.edit_any", label: "Edit any task", description: "Can edit any visible task" },
      { key: "tasks.edit_assigned", label: "Edit assigned tasks", description: "Can edit tasks assigned to them" },
      { key: "tasks.view_private", label: "View private tasks", description: "Can see tasks marked as private" },
      { key: "tasks.assign", label: "Assign tasks", description: "Can assign tasks to others" },
      { key: "tasks.comment", label: "Comment on tasks", description: "Can add comments to tasks" },
    ],
  },
  {
    title: "Vendors",
    capabilities: [
      { key: "vendors.view", label: "View vendors", description: "Can view vendor list" },
      { key: "vendors.manage", label: "Manage vendors", description: "Can add/edit vendor profiles" },
    ],
  },
  {
    title: "Quotes",
    capabilities: [
      { key: "quotes.view", label: "View quotes", description: "Can view vendor quotes" },
      { key: "quotes.manage", label: "Manage quotes", description: "Can create and edit quotes" },
    ],
  },
  {
    title: "Payments",
    capabilities: [
      { key: "payments.create", label: "Record payments", description: "Can record new payments" },
      { key: "payments.approve", label: "Approve payments", description: "Can approve payment requests" },
      { key: "payments.view_all", label: "View all payments", description: "Can see all payment records" },
      { key: "payments.view_own", label: "View own payments", description: "Can see their own payments" },
    ],
  },
]

export default function PermissionsPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<PermissionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeRole, setActiveRole] = useState("PLANNER")

  // Local state for editing
  const [editedPermissions, setEditedPermissions] = useState<
    Record<string, Record<string, boolean>>
  >({})

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch("/api/permissions")
      if (res.ok) {
        const result = await res.json()
        setData(result)
        setEditedPermissions(result.permissions)
      } else {
        const err = await res.json()
        setError(err.error || "Failed to load permissions")
      }
    } catch (err) {
      setError("Failed to load permissions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const handleToggle = (role: string, capability: string) => {
    if (!data?.canEdit) return

    setEditedPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [capability]: !prev[role]?.[capability],
      },
    }))
    setSuccess(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch("/api/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: editedPermissions }),
      })

      if (res.ok) {
        const result = await res.json()
        setData(result)
        setEditedPermissions(result.permissions)
        setSuccess(true)
      } else {
        const err = await res.json()
        setError(err.error || "Failed to save permissions")
      }
    } catch (err) {
      setError("Failed to save permissions")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (data) {
      setEditedPermissions(data.defaults)
      setSuccess(false)
    }
  }

  const isChanged = JSON.stringify(editedPermissions) !== JSON.stringify(data?.permissions)

  if (!session) {
    return null
  }

  const isBrideOrGroom = session.user.role === "BRIDE" || session.user.role === "GROOM"

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav userName={session.user.name} userRole={session.user.role} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Permissions</h1>
            <p className="text-gray-600 mt-1">
              Control what each role can do in your wedding planning
            </p>
          </div>
          {data?.canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} disabled={saving}>
                Reset to Defaults
              </Button>
              <Button onClick={handleSave} disabled={saving || !isChanged}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        {!isBrideOrGroom && (
          <Alert className="mb-6">
            <AlertDescription>
              Only the bride and groom can modify permissions. You can view the current settings.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6">
            <AlertDescription>Permissions saved successfully!</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Permission Matrix</CardTitle>
                <CardDescription>
                  Bride and Groom always have full access. Configure permissions for other roles below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeRole} onValueChange={setActiveRole}>
                  <TabsList className="mb-4">
                    {ROLES.map((role) => (
                      <TabsTrigger key={role.value} value={role.value}>
                        {role.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {ROLES.map((role) => (
                    <TabsContent key={role.value} value={role.value}>
                      <div className="space-y-6">
                        {CAPABILITY_GROUPS.map((group) => (
                          <div key={group.title}>
                            <h3 className="font-semibold text-lg mb-3">{group.title}</h3>
                            <div className="grid gap-3">
                              {group.capabilities.map((cap) => {
                                const isEnabled =
                                  editedPermissions[role.value]?.[cap.key] ?? false
                                const isDefault =
                                  data?.defaults[role.value]?.[cap.key] ?? false

                                return (
                                  <div
                                    key={cap.key}
                                    className={`flex items-center justify-between p-4 rounded-lg border ${
                                      data?.canEdit
                                        ? "cursor-pointer hover:bg-gray-50"
                                        : ""
                                    } ${isEnabled ? "bg-green-50 border-green-200" : "bg-gray-50"}`}
                                    onClick={() => handleToggle(role.value, cap.key)}
                                  >
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{cap.label}</span>
                                        {isDefault && (
                                          <Badge variant="outline" className="text-xs">
                                            Default
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-500">{cap.description}</p>
                                    </div>
                                    <div
                                      className={`w-12 h-6 rounded-full p-1 transition-colors ${
                                        isEnabled ? "bg-green-500" : "bg-gray-300"
                                      }`}
                                    >
                                      <div
                                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                          isEnabled ? "translate-x-6" : "translate-x-0"
                                        }`}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Descriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Badge className="mt-1">Bride/Groom</Badge>
                    <p className="text-gray-600">
                      Full access to all features. Can modify permissions for other roles.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">
                      Wedding Planner
                    </Badge>
                    <p className="text-gray-600">
                      Professional wedding planner with broad access to manage planning tasks,
                      vendors, and budgets. By default cannot view private tasks.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">
                      Parents
                    </Badge>
                    <p className="text-gray-600">
                      Parents of the bride or groom. Can view and help with tasks visible to
                      them, view quotes, but cannot manage vendors or payments by default.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">
                      Family Helper
                    </Badge>
                    <p className="text-gray-600">
                      Extended family members helping with planning. More limited access than
                      parents, primarily for tasks assigned to them.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">
                      Vendor
                    </Badge>
                    <p className="text-gray-600">
                      External vendors (photographer, caterer, etc.). Can only see tasks
                      assigned to them and their own quotes/payments.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
