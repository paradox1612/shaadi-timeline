"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Plus,
  Users,
  Phone,
  Mail,
  Pencil,
  Trash2,
  Building2,
  User,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface Quote {
  id: string
  title: string
  amountTotal: number
  currency: string
  notes: string | null
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED"
  totalPaid: number
  remaining: number
  createdAt: string
}

interface Vendor {
  id: string
  type: string
  companyName: string
  contactName: string
  phone: string | null
  email: string | null
  notes: string | null
  user: { id: string; name: string; email: string } | null
  quotes?: Quote[]
}

const QUOTE_STATUS_LABELS: Record<Quote["status"], string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
}

const QUOTE_STATUS_COLORS: Record<Quote["status"], string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SENT: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
}

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount)
}

const VENDOR_TYPES = [
  { value: "PHOTOGRAPHER", label: "Photographer", icon: "📷" },
  { value: "VIDEOGRAPHER", label: "Videographer", icon: "🎥" },
  { value: "DJ", label: "DJ", icon: "🎵" },
  { value: "CATERER", label: "Caterer", icon: "🍽️" },
  { value: "DECOR", label: "Decor", icon: "🎨" },
  { value: "MUA", label: "Makeup Artist", icon: "💄" },
  { value: "OTHER", label: "Other", icon: "✨" },
]

export default function VendorsPage() {
  const { data: session } = useSession()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [quotes, setQuotes] = useState<(Quote & { vendorId: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set())

  // Quote dialog state
  const [showQuoteDialog, setShowQuoteDialog] = useState(false)
  const [editingQuote, setEditingQuote] = useState<(Quote & { vendorId: string }) | null>(null)
  const [quoteVendorId, setQuoteVendorId] = useState<string>("")

  // Quote form state
  const [quoteTitle, setQuoteTitle] = useState("")
  const [quoteAmount, setQuoteAmount] = useState("")
  const [quoteStatus, setQuoteStatus] = useState<Quote["status"]>("DRAFT")
  const [quoteNotes, setQuoteNotes] = useState("")

  // Form state
  const [formType, setFormType] = useState("PHOTOGRAPHER")
  const [formCompanyName, setFormCompanyName] = useState("")
  const [formContactName, setFormContactName] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formNotes, setFormNotes] = useState("")

  const fetchData = async () => {
    try {
      const [vendorsRes, quotesRes] = await Promise.all([
        fetch("/api/vendors"),
        fetch("/api/quotes"),
      ])
      if (vendorsRes.ok) {
        const data = await vendorsRes.json()
        setVendors(Array.isArray(data) ? data : [])
      }
      if (quotesRes.ok) {
        const data = await quotesRes.json()
        setQuotes(
          Array.isArray(data)
            ? data.map((q: Quote & { vendor: { id: string } }) => ({
                ...q,
                vendorId: q.vendor.id,
              }))
            : []
        )
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
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

  const resetQuoteForm = () => {
    setQuoteTitle("")
    setQuoteAmount("")
    setQuoteStatus("DRAFT")
    setQuoteNotes("")
    setEditingQuote(null)
    setQuoteVendorId("")
  }

  const openAddQuoteDialog = (vendorId: string) => {
    resetQuoteForm()
    setQuoteVendorId(vendorId)
    setShowQuoteDialog(true)
  }

  const openEditQuoteDialog = (quote: Quote & { vendorId: string }) => {
    setEditingQuote(quote)
    setQuoteVendorId(quote.vendorId)
    setQuoteTitle(quote.title)
    setQuoteAmount(quote.amountTotal.toString())
    setQuoteStatus(quote.status)
    setQuoteNotes(quote.notes || "")
    setShowQuoteDialog(true)
  }

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      vendorId: quoteVendorId,
      title: quoteTitle,
      amountTotal: parseFloat(quoteAmount),
      status: quoteStatus,
      notes: quoteNotes || null,
    }

    try {
      const res = await fetch(
        editingQuote ? `/api/quotes/${editingQuote.id}` : "/api/quotes",
        {
          method: editingQuote ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      if (res.ok) {
        setShowQuoteDialog(false)
        resetQuoteForm()
        fetchData()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to save quote")
      }
    } catch (error) {
      console.error("Failed to save quote:", error)
      alert("Failed to save quote")
    }
  }

  const handleDeleteQuote = async (quoteId: string) => {
    if (!confirm("Are you sure you want to delete this quote?")) return
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: "DELETE" })
      if (res.ok) {
        fetchData()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete quote")
      }
    } catch (error) {
      console.error("Failed to delete quote:", error)
    }
  }

  const toggleVendorExpanded = (vendorId: string) => {
    setExpandedVendors((prev) => {
      const next = new Set(prev)
      if (next.has(vendorId)) {
        next.delete(vendorId)
      } else {
        next.add(vendorId)
      }
      return next
    })
  }

  const getVendorQuotes = (vendorId: string) => {
    return quotes.filter((q) => q.vendorId === vendorId)
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

  const getVendorType = (type: string) => {
    return VENDOR_TYPES.find((t) => t.value === type) || { label: type, icon: "✨" }
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

  const vendorFormContent = (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="vendorType" className="text-sm font-medium">Vendor Type</Label>
        <Select value={formType} onValueChange={setFormType}>
          <SelectTrigger className="mt-1.5 h-12 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VENDOR_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <span className="flex items-center gap-2">
                  <span>{type.icon}</span>
                  {type.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="companyName" className="text-sm font-medium">Company Name</Label>
        <div className="relative mt-1.5">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="companyName"
            value={formCompanyName}
            onChange={(e) => setFormCompanyName(e.target.value)}
            placeholder="Enter company name"
            className="h-12 pl-10 rounded-xl"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="contactName" className="text-sm font-medium">Contact Person</Label>
        <div className="relative mt-1.5">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="contactName"
            value={formContactName}
            onChange={(e) => setFormContactName(e.target.value)}
            placeholder="Enter contact name"
            className="h-12 pl-10 rounded-xl"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
          <div className="relative mt-1.5">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="Phone"
              className="h-12 pl-10 rounded-xl"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="email" className="text-sm font-medium">Email</Label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="Email"
              className="h-12 pl-10 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
        <Textarea
          id="notes"
          value={formNotes}
          onChange={(e) => setFormNotes(e.target.value)}
          placeholder="Any notes about this vendor..."
          className="mt-1.5 rounded-xl resize-none"
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full h-12 rounded-xl">
        {editingVendor ? "Update Vendor" : "Add Vendor"}
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
            <h1 className="text-2xl md:text-3xl font-bold">Vendors</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your wedding vendors</p>
          </div>

          {/* Mobile: Bottom Sheet */}
          <div className="md:hidden">
            <Sheet
              open={showAddVendor}
              onOpenChange={(open) => {
                setShowAddVendor(open)
                if (!open) resetForm()
              }}
            >
              <SheetTrigger asChild>
                <Button size="sm" className="rounded-full gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl px-6 pb-8 overflow-y-auto safe-bottom">
                <div className="mx-auto w-12 h-1.5 bg-muted rounded-full mb-6 mt-2" />
                <SheetHeader className="text-left pb-4">
                  <SheetTitle className="text-xl">
                    {editingVendor ? "Edit Vendor" : "Add Vendor"}
                  </SheetTitle>
                </SheetHeader>
                {vendorFormContent}
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop: Dialog */}
          <div className="hidden md:block">
            <Dialog
              open={showAddVendor}
              onOpenChange={(open) => {
                setShowAddVendor(open)
                if (!open) resetForm()
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 rounded-full">
                  <Plus className="h-4 w-4" />
                  Add Vendor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
                </DialogHeader>
                <div className="pt-4">
                  {vendorFormContent}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quote Dialog */}
        <Dialog
          open={showQuoteDialog}
          onOpenChange={(open) => {
            setShowQuoteDialog(open)
            if (!open) resetQuoteForm()
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingQuote ? "Edit Quote" : "Add Quote"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleQuoteSubmit} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="quoteTitle" className="text-sm font-medium">Title *</Label>
                <div className="relative mt-1.5">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="quoteTitle"
                    value={quoteTitle}
                    onChange={(e) => setQuoteTitle(e.target.value)}
                    placeholder="e.g., Photography Package A"
                    className="h-12 pl-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="quoteAmount" className="text-sm font-medium">Amount *</Label>
                  <div className="relative mt-1.5">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="quoteAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-12 pl-10 rounded-xl"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="quoteStatus" className="text-sm font-medium">Status</Label>
                  <Select value={quoteStatus} onValueChange={(v) => setQuoteStatus(v as Quote["status"])}>
                    <SelectTrigger className="mt-1.5 h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="quoteNotes" className="text-sm font-medium">Notes</Label>
                <Textarea
                  id="quoteNotes"
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="Any notes about this quote..."
                  className="mt-1.5 rounded-xl resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => {
                    setShowQuoteDialog(false)
                    resetQuoteForm()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 h-12 rounded-xl">
                  {editingQuote ? "Update" : "Add"} Quote
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {vendors.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">
                No vendors added yet. Add your first vendor to get started.
              </p>
              <Button onClick={() => setShowAddVendor(true)} className="rounded-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vendors.map((vendor) => {
              const vendorType = getVendorType(vendor.type)
              const vendorQuotes = getVendorQuotes(vendor.id)
              const isExpanded = expandedVendors.has(vendor.id)
              return (
                <Card key={vendor.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                        {vendorType.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">{vendor.companyName}</h3>
                            <Badge variant="secondary" className="text-xs rounded-full mt-1">
                              {vendorType.label}
                            </Badge>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-full"
                              onClick={() => handleEdit(vendor)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-full"
                              onClick={() => handleDelete(vendor.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="mt-3 space-y-1.5 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate">{vendor.contactName}</span>
                          </div>
                          {vendor.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              <a href={`tel:${vendor.phone}`} className="hover:text-primary">
                                {vendor.phone}
                              </a>
                            </div>
                          )}
                          {vendor.email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              <a href={`mailto:${vendor.email}`} className="truncate hover:text-primary">
                                {vendor.email}
                              </a>
                            </div>
                          )}
                        </div>

                        {vendor.notes && (
                          <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-dashed line-clamp-2">
                            {vendor.notes}
                          </p>
                        )}

                        {/* Quotes Section */}
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => toggleVendorExpanded(vendor.id)}
                              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Quotes ({vendorQuotes.length})
                              {vendorQuotes.length > 0 && (
                                isExpanded ? (
                                  <ChevronUp className="h-3.5 w-3.5" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5" />
                                )
                              )}
                            </button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => openAddQuoteDialog(vendor.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>

                          {isExpanded && vendorQuotes.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {vendorQuotes.map((quote) => (
                                <div
                                  key={quote.id}
                                  className="p-2 rounded-lg bg-muted/50 text-sm"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium truncate">{quote.title}</span>
                                        <Badge className={`text-xs ${QUOTE_STATUS_COLORS[quote.status]}`}>
                                          {QUOTE_STATUS_LABELS[quote.status]}
                                        </Badge>
                                      </div>
                                      <div className="text-muted-foreground mt-0.5">
                                        {formatCurrency(quote.amountTotal, quote.currency)}
                                        {quote.totalPaid > 0 && (
                                          <span className="text-green-600 ml-2">
                                            (Paid: {formatCurrency(quote.totalPaid, quote.currency)})
                                          </span>
                                        )}
                                      </div>
                                      {quote.notes && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                          {quote.notes}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => openEditQuoteDialog(quote)}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDeleteQuote(quote.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
