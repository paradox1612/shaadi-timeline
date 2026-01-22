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
import { Separator } from "@/components/ui/separator"

type Quote = {
  id: string
  title: string
  amountTotal: number
  currency: string
  notes: string | null
  lineItems: { description: string; amount: number; quantity?: number }[]
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED"
  vendor: {
    id: string
    companyName: string
    contactName: string
    type: string
  }
  createdBy: { id: string; name: string; email: string }
  payments: {
    id: string
    amount: number
    currency: string
    paidAt: string
    method: string
  }[]
  totalPaid: number
  remaining: number
  createdAt: string
}

type Payment = {
  id: string
  amount: number
  currency: string
  paidAt: string
  method: "CASH" | "ZELLE" | "VENMO" | "BANK" | "CARD" | "OTHER"
  note: string | null
  vendor: { id: string; companyName: string; type: string } | null
  quote: { id: string; title: string; amountTotal: number } | null
  createdBy: { id: string; name: string; email: string }
}

type BudgetSummary = {
  overall: {
    totalQuoted: number
    totalAccepted: number
    totalPaid: number
    totalRemaining: number
    quoteCount: number
    paymentCount: number
  }
  quotesByStatus: {
    DRAFT: number
    SENT: number
    ACCEPTED: number
    REJECTED: number
  }
  byVendor: {
    vendorId: string
    companyName: string
    type: string
    totalQuoted: number
    totalAccepted: number
    totalPaid: number
    remaining: number
    quotes: number
    payments: number
  }[]
}

type Vendor = {
  id: string
  companyName: string
  type: string
}

const STATUS_LABELS: Record<Quote["status"], string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
}

const STATUS_COLORS: Record<Quote["status"], string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SENT: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
}

const METHOD_LABELS: Record<Payment["method"], string> = {
  CASH: "Cash",
  ZELLE: "Zelle",
  VENMO: "Venmo",
  BANK: "Bank Transfer",
  CARD: "Card",
  OTHER: "Other",
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

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount)
}

export default function BudgetPage() {
  const { data: session } = useSession()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  // Quote dialog state
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
  const [quoteForm, setQuoteForm] = useState({
    vendorId: "",
    title: "",
    amountTotal: "",
    currency: "USD",
    notes: "",
    status: "DRAFT" as Quote["status"],
  })

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    vendorId: "",
    quoteId: "",
    amount: "",
    currency: "USD",
    paidAt: new Date().toISOString().split("T")[0],
    method: "OTHER" as Payment["method"],
    note: "",
  })

  const fetchData = useCallback(async () => {
    try {
      const [quotesRes, paymentsRes, summaryRes, vendorsRes] = await Promise.all([
        fetch("/api/quotes"),
        fetch("/api/payments"),
        fetch("/api/budget"),
        fetch("/api/vendors"),
      ])

      if (quotesRes.ok) {
        setQuotes(await quotesRes.json())
      }
      if (paymentsRes.ok) {
        setPayments(await paymentsRes.json())
      }
      if (summaryRes.ok) {
        setSummary(await summaryRes.json())
      }
      if (vendorsRes.ok) {
        setVendors(await vendorsRes.json())
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      vendorId: quoteForm.vendorId,
      title: quoteForm.title,
      amountTotal: parseFloat(quoteForm.amountTotal),
      currency: quoteForm.currency,
      notes: quoteForm.notes || null,
      status: quoteForm.status,
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
        setQuoteDialogOpen(false)
        resetQuoteForm()
        fetchData()
      } else {
        const message = await getErrorMessage(res, "Failed to save quote")
        alert(message)
      }
    } catch (error) {
      console.error("Failed to save quote:", error)
      alert("Failed to save quote")
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      vendorId: paymentForm.vendorId || null,
      quoteId: paymentForm.quoteId || null,
      amount: parseFloat(paymentForm.amount),
      currency: paymentForm.currency,
      paidAt: paymentForm.paidAt,
      method: paymentForm.method,
      note: paymentForm.note || null,
    }

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setPaymentDialogOpen(false)
        resetPaymentForm()
        fetchData()
      } else {
        const message = await getErrorMessage(res, "Failed to record payment")
        alert(message)
      }
    } catch (error) {
      console.error("Failed to record payment:", error)
      alert("Failed to record payment")
    }
  }

  const handleDeleteQuote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quote?")) return

    try {
      const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchData()
      } else {
        const message = await getErrorMessage(res, "Failed to delete quote")
        alert(message)
      }
    } catch (error) {
      console.error("Failed to delete quote:", error)
    }
  }

  const handleDeletePayment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payment?")) return

    try {
      const res = await fetch(`/api/payments/${id}`, { method: "DELETE" })
      if (res.ok) {
        fetchData()
      } else {
        const message = await getErrorMessage(res, "Failed to delete payment")
        alert(message)
      }
    } catch (error) {
      console.error("Failed to delete payment:", error)
    }
  }

  const resetQuoteForm = () => {
    setQuoteForm({
      vendorId: "",
      title: "",
      amountTotal: "",
      currency: "USD",
      notes: "",
      status: "DRAFT",
    })
    setEditingQuote(null)
  }

  const resetPaymentForm = () => {
    setPaymentForm({
      vendorId: "",
      quoteId: "",
      amount: "",
      currency: "USD",
      paidAt: new Date().toISOString().split("T")[0],
      method: "OTHER",
      note: "",
    })
  }

  const openEditQuoteDialog = (quote: Quote) => {
    setEditingQuote(quote)
    setQuoteForm({
      vendorId: quote.vendor.id,
      title: quote.title,
      amountTotal: quote.amountTotal.toString(),
      currency: quote.currency,
      notes: quote.notes || "",
      status: quote.status,
    })
    setQuoteDialogOpen(true)
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
            <h1 className="text-2xl sm:text-3xl font-bold">Budget</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Track vendor quotes and payments
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Dialog open={quoteDialogOpen} onOpenChange={(open) => {
              setQuoteDialogOpen(open)
              if (!open) resetQuoteForm()
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none">+ New Quote</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingQuote ? "Edit Quote" : "Add New Quote"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleQuoteSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="vendor">Vendor *</Label>
                    <Select
                      value={quoteForm.vendorId}
                      onValueChange={(v) => setQuoteForm({ ...quoteForm, vendorId: v })}
                      disabled={!!editingQuote}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quoteTitle">Title *</Label>
                    <Input
                      id="quoteTitle"
                      value={quoteForm.title}
                      onChange={(e) => setQuoteForm({ ...quoteForm, title: e.target.value })}
                      placeholder="e.g., Photography Package A"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={quoteForm.amountTotal}
                        onChange={(e) => setQuoteForm({ ...quoteForm, amountTotal: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={quoteForm.status}
                        onValueChange={(v) => setQuoteForm({ ...quoteForm, status: v as Quote["status"] })}
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
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={quoteForm.notes}
                      onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => {
                      setQuoteDialogOpen(false)
                      resetQuoteForm()
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingQuote ? "Update" : "Add"} Quote
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
              setPaymentDialogOpen(open)
              if (!open) resetPaymentForm()
            }}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none">+ Record Payment</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="paymentVendor">Vendor</Label>
                    <Select
                      value={paymentForm.vendorId}
                      onValueChange={(v) => setPaymentForm({ ...paymentForm, vendorId: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No vendor</SelectItem>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quote">Quote</Label>
                    <Select
                      value={paymentForm.quoteId}
                      onValueChange={(v) => setPaymentForm({ ...paymentForm, quoteId: v === "none" ? "" : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Link to quote (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No quote</SelectItem>
                        {quotes
                          .filter((q) => !paymentForm.vendorId || q.vendor.id === paymentForm.vendorId)
                          .map((quote) => (
                            <SelectItem key={quote.id} value={quote.id}>
                              {quote.title} - {formatCurrency(quote.amountTotal)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentAmount">Amount *</Label>
                      <Input
                        id="paymentAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="method">Method</Label>
                      <Select
                        value={paymentForm.method}
                        onValueChange={(v) => setPaymentForm({ ...paymentForm, method: v as Payment["method"] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(METHOD_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="paidAt">Payment Date</Label>
                    <Input
                      id="paidAt"
                      type="date"
                      value={paymentForm.paidAt}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="paymentNote">Note</Label>
                    <Textarea
                      id="paymentNote"
                      value={paymentForm.note}
                      onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                      rows={2}
                      placeholder="e.g., Deposit payment"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => {
                      setPaymentDialogOpen(false)
                      resetPaymentForm()
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit">Record Payment</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
                      Total Quoted
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-lg sm:text-2xl font-bold truncate">
                      {formatCurrency(summary.overall.totalQuoted)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {summary.overall.quoteCount} quotes
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
                      Accepted
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-lg sm:text-2xl font-bold text-green-600 truncate">
                      {formatCurrency(summary.overall.totalAccepted)}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {summary.quotesByStatus.ACCEPTED} accepted
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
                      Total Paid
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-lg sm:text-2xl font-bold text-blue-600 truncate">
                      {formatCurrency(summary.overall.totalPaid)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {summary.overall.paymentCount} payments
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
                      Remaining
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className={`text-lg sm:text-2xl font-bold truncate ${
                      summary.overall.totalRemaining > 0 ? "text-orange-600" : "text-green-600"
                    }`}>
                      {formatCurrency(summary.overall.totalRemaining)}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      from accepted
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="quotes">Quotes ({quotes.length})</TabsTrigger>
                <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                {summary && summary.byVendor.length > 0 ? (
                  <div className="grid gap-4">
                    {summary.byVendor.map((vendor) => (
                      <Card key={vendor.vendorId}>
                        <CardContent className="pt-4 sm:pt-6">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                            <div>
                              <h3 className="font-semibold text-base sm:text-lg">{vendor.companyName}</h3>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {vendor.type}
                              </Badge>
                            </div>
                            <div className="text-left sm:text-right">
                              <div className="text-xl sm:text-2xl font-bold">
                                {formatCurrency(vendor.totalAccepted)}
                              </div>
                              <p className="text-xs sm:text-sm text-gray-500">accepted</p>
                            </div>
                          </div>
                          <Separator className="my-3 sm:my-4" />
                          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                            <div>
                              <div className="text-sm sm:text-lg font-medium truncate">
                                {formatCurrency(vendor.totalQuoted)}
                              </div>
                              <p className="text-xs text-gray-500">{vendor.quotes} quotes</p>
                            </div>
                            <div>
                              <div className="text-sm sm:text-lg font-medium text-blue-600 truncate">
                                {formatCurrency(vendor.totalPaid)}
                              </div>
                              <p className="text-xs text-gray-500">{vendor.payments} paid</p>
                            </div>
                            <div>
                              <div className={`text-sm sm:text-lg font-medium truncate ${
                                vendor.remaining > 0 ? "text-orange-600" : "text-green-600"
                              }`}>
                                {formatCurrency(vendor.remaining)}
                              </div>
                              <p className="text-xs text-gray-500">remaining</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No vendor data yet. Add quotes to see budget breakdown.
                  </div>
                )}
              </TabsContent>

              {/* Quotes Tab */}
              <TabsContent value="quotes">
                {quotes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No quotes yet. Add your first vendor quote to get started.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {quotes.map((quote) => (
                      <Card key={quote.id}>
                        <CardContent className="pt-4 sm:pt-6">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="font-semibold text-base sm:text-lg">{quote.title}</h3>
                                <Badge className={`${STATUS_COLORS[quote.status]} text-xs`}>
                                  {STATUS_LABELS[quote.status]}
                                </Badge>
                              </div>
                              <p className="text-gray-600 text-sm sm:text-base">{quote.vendor.companyName}</p>
                              {quote.notes && (
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{quote.notes}</p>
                              )}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs sm:text-sm">
                                <span>
                                  Total: <strong>{formatCurrency(quote.amountTotal)}</strong>
                                </span>
                                <span className="text-blue-600">
                                  Paid: {formatCurrency(quote.totalPaid)}
                                </span>
                                <span className={quote.remaining > 0 ? "text-orange-600" : "text-green-600"}>
                                  Remaining: {formatCurrency(quote.remaining)}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 sm:flex-none"
                                onClick={() => openEditQuoteDialog(quote)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1 sm:flex-none"
                                onClick={() => handleDeleteQuote(quote.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No payments recorded yet.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {payments.map((payment) => (
                      <Card key={payment.id}>
                        <CardContent className="pt-4 sm:pt-6">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="font-semibold text-base sm:text-lg">
                                  {formatCurrency(payment.amount, payment.currency)}
                                </h3>
                                <Badge variant="outline" className="text-xs">{METHOD_LABELS[payment.method]}</Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-600">
                                {payment.vendor && (
                                  <span>Vendor: {payment.vendor.companyName}</span>
                                )}
                                {payment.quote && (
                                  <span>Quote: {payment.quote.title}</span>
                                )}
                                <span>
                                  Date: {new Date(payment.paidAt).toLocaleDateString()}
                                </span>
                              </div>
                              {payment.note && (
                                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{payment.note}</p>
                              )}
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full sm:w-auto"
                              onClick={() => handleDeletePayment(payment.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  )
}
