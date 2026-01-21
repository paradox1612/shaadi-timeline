"use client"

import { useEffect, useState } from "react"
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

interface Vendor {
  id: string
  type: string
  companyName: string
  contactName: string
  phone: string | null
  email: string | null
  notes: string | null
  user: { id: string; name: string; email: string } | null
}

const VENDOR_TYPES = [
  { value: "PHOTOGRAPHER", label: "Photographer" },
  { value: "VIDEOGRAPHER", label: "Videographer" },
  { value: "DJ", label: "DJ" },
  { value: "CATERER", label: "Caterer" },
  { value: "DECOR", label: "Decor" },
  { value: "MUA", label: "Makeup Artist" },
  { value: "OTHER", label: "Other" },
]

export default function VendorsPage() {
  const { data: session } = useSession()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)

  // Form state
  const [formType, setFormType] = useState("PHOTOGRAPHER")
  const [formCompanyName, setFormCompanyName] = useState("")
  const [formContactName, setFormContactName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formNotes, setFormNotes] = useState("")

  useEffect(() => {
    fetch("/api/vendors")
      .then((res) => res.json())
      .then((data) => {
        setVendors(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  const resetForm = () => {
    setFormType("PHOTOGRAPHER")
    setFormCompanyName("")
    setFormContactName("")
    setFormPhone("")
    setFormEmail("")
    setFormNotes("")
    setEditingVendor(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const vendorData = {
      type: formType,
      companyName: formCompanyName,
      contactName: formContactName,
      phone: formPhone || null,
      email: formEmail || null,
      notes: formNotes || null,
    }

    if (editingVendor) {
      const res = await fetch(`/api/vendors/${editingVendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorData),
      })
      if (res.ok) {
        const updated = await res.json()
        setVendors(vendors.map((v) => (v.id === updated.id ? { ...v, ...updated } : v)))
        setShowAddVendor(false)
        resetForm()
      }
    } else {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vendorData),
      })
      if (res.ok) {
        const newVendor = await res.json()
        setVendors([...vendors, newVendor])
        setShowAddVendor(false)
        resetForm()
      }
    }
  }

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setFormType(vendor.type)
    setFormCompanyName(vendor.companyName)
    setFormContactName(vendor.contactName)
    setFormPhone(vendor.phone || "")
    setFormEmail(vendor.email || "")
    setFormNotes(vendor.notes || "")
    setShowAddVendor(true)
  }

  const handleDelete = async (vendorId: string) => {
    if (!confirm("Are you sure you want to delete this vendor?")) return
    const res = await fetch(`/api/vendors/${vendorId}`, {
      method: "DELETE",
    })
    if (res.ok) {
      setVendors(vendors.filter((v) => v.id !== vendorId))
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
            <h1 className="text-3xl font-bold">Vendors</h1>
            <p className="text-muted-foreground">Manage your wedding vendors</p>
          </div>
          <Dialog
            open={showAddVendor}
            onOpenChange={(open) => {
              setShowAddVendor(open)
              if (!open) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button>+ Add Vendor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="vendorType">Vendor Type</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VENDOR_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formCompanyName}
                    onChange={(e) => setFormCompanyName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contactName">Contact Person</Label>
                  <Input
                    id="contactName"
                    value={formContactName}
                    onChange={(e) => setFormContactName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Any notes about this vendor..."
                  />
                </div>
                <DialogFooter>
                  <Button type="submit">{editingVendor ? "Update" : "Add"} Vendor</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {vendors.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground mb-4">
                No vendors added yet. Add your first vendor to get started.
              </p>
              <Button onClick={() => setShowAddVendor(true)}>Add Vendor</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map((vendor) => (
              <Card key={vendor.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{vendor.companyName}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {VENDOR_TYPES.find((t) => t.value === vendor.type)?.label || vendor.type}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Contact:</span> {vendor.contactName}
                    </p>
                    {vendor.phone && (
                      <p>
                        <span className="text-muted-foreground">Phone:</span> {vendor.phone}
                      </p>
                    )}
                    {vendor.email && (
                      <p>
                        <span className="text-muted-foreground">Email:</span> {vendor.email}
                      </p>
                    )}
                    {vendor.notes && (
                      <p className="text-muted-foreground text-xs mt-2">{vendor.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(vendor)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600"
                      onClick={() => handleDelete(vendor.id)}
                    >
                      Delete
                    </Button>
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
