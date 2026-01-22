import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireWedding } from "@/lib/api-helpers"
import { canViewQuotes, canViewPayments } from "@/lib/permissions"

// GET /api/budget - Get budget summary
export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  // Check permissions
  const canSeeQuotes = await canViewQuotes(
    session.user.id,
    session.user.role,
    wedding.id,
    session.user.vendorProfileId
  )

  const { viewAll: canSeeAllPayments } = await canViewPayments(
    session.user.id,
    session.user.role,
    wedding.id,
    session.user.vendorProfileId
  )

  if (!canSeeQuotes || !canSeeAllPayments) {
    return NextResponse.json(
      { error: "You don't have permission to view budget" },
      { status: 403 }
    )
  }

  // Get all accepted quotes with their vendors
  const quotes = await prisma.vendorQuote.findMany({
    where: { weddingId: wedding.id },
    include: {
      vendor: {
        select: {
          id: true,
          companyName: true,
          type: true,
        },
      },
    },
  })

  // Get all payments
  const payments = await prisma.payment.findMany({
    where: { weddingId: wedding.id },
    include: {
      vendor: {
        select: {
          id: true,
          companyName: true,
          type: true,
        },
      },
    },
  })

  // Calculate totals by vendor
  const vendorSummary: Record<
    string,
    {
      vendorId: string
      companyName: string
      type: string
      totalQuoted: number
      totalAccepted: number
      totalPaid: number
      remaining: number
      quotes: number
      payments: number
    }
  > = {}

  // Process quotes
  for (const quote of quotes) {
    if (!vendorSummary[quote.vendorId]) {
      vendorSummary[quote.vendorId] = {
        vendorId: quote.vendorId,
        companyName: quote.vendor.companyName,
        type: quote.vendor.type,
        totalQuoted: 0,
        totalAccepted: 0,
        totalPaid: 0,
        remaining: 0,
        quotes: 0,
        payments: 0,
      }
    }

    vendorSummary[quote.vendorId].totalQuoted += quote.amountTotal
    vendorSummary[quote.vendorId].quotes += 1

    if (quote.status === "ACCEPTED") {
      vendorSummary[quote.vendorId].totalAccepted += quote.amountTotal
    }
  }

  // Process payments
  for (const payment of payments) {
    if (payment.vendorId) {
      if (!vendorSummary[payment.vendorId]) {
        vendorSummary[payment.vendorId] = {
          vendorId: payment.vendorId,
          companyName: payment.vendor?.companyName || "Unknown",
          type: payment.vendor?.type || "OTHER",
          totalQuoted: 0,
          totalAccepted: 0,
          totalPaid: 0,
          remaining: 0,
          quotes: 0,
          payments: 0,
        }
      }
      vendorSummary[payment.vendorId].totalPaid += payment.amount
      vendorSummary[payment.vendorId].payments += 1
    }
  }

  // Calculate remaining for each vendor
  for (const vendorId in vendorSummary) {
    const vendor = vendorSummary[vendorId]
    vendor.remaining = vendor.totalAccepted - vendor.totalPaid
  }

  // Calculate overall totals
  const totalQuoted = Object.values(vendorSummary).reduce(
    (sum, v) => sum + v.totalQuoted,
    0
  )
  const totalAccepted = Object.values(vendorSummary).reduce(
    (sum, v) => sum + v.totalAccepted,
    0
  )
  const totalPaid = Object.values(vendorSummary).reduce(
    (sum, v) => sum + v.totalPaid,
    0
  )
  const totalRemaining = totalAccepted - totalPaid

  // Quote status breakdown
  const quotesByStatus = {
    DRAFT: quotes.filter((q) => q.status === "DRAFT").length,
    SENT: quotes.filter((q) => q.status === "SENT").length,
    ACCEPTED: quotes.filter((q) => q.status === "ACCEPTED").length,
    REJECTED: quotes.filter((q) => q.status === "REJECTED").length,
  }

  return NextResponse.json({
    overall: {
      totalQuoted,
      totalAccepted,
      totalPaid,
      totalRemaining,
      quoteCount: quotes.length,
      paymentCount: payments.length,
    },
    quotesByStatus,
    byVendor: Object.values(vendorSummary).sort(
      (a, b) => b.totalAccepted - a.totalAccepted
    ),
  })
}
