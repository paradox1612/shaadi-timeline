import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireWedding, isVendor } from "@/lib/api-helpers"
import { canViewQuotes, canManageQuotes } from "@/lib/permissions"
import { createQuoteSchema } from "@/lib/validators"

// GET /api/quotes - List quotes
export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  // Check permission
  const canView = await canViewQuotes(
    session.user.id,
    session.user.role,
    wedding.id,
    session.user.vendorProfileId
  )

  if (!canView) {
    return NextResponse.json(
      { error: "You don't have permission to view quotes" },
      { status: 403 }
    )
  }

  // Build where clause based on role
  const where: { weddingId: string; vendorId?: string } = { weddingId: wedding.id }

  // Vendors can only see their own quotes
  if (isVendor(session.user.role) && session.user.vendorProfileId) {
    where.vendorId = session.user.vendorProfileId
  }

  const quotes = await prisma.vendorQuote.findMany({
    where,
    include: {
      vendor: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          type: true,
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      payments: {
        select: {
          id: true,
          amount: true,
          currency: true,
          paidAt: true,
          method: true,
        },
      },
      _count: {
        select: { payments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Calculate total paid for each quote
  const quotesWithTotals = quotes.map((quote) => ({
    ...quote,
    totalPaid: quote.payments.reduce((sum, p) => sum + p.amount, 0),
    remaining: quote.amountTotal - quote.payments.reduce((sum, p) => sum + p.amount, 0),
  }))

  return NextResponse.json(quotesWithTotals)
}

// POST /api/quotes - Create a new quote
export async function POST(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  // Check permission
  const canManage = await canManageQuotes(
    session.user.id,
    session.user.role,
    wedding.id
  )

  if (!canManage) {
    return NextResponse.json(
      { error: "You don't have permission to create quotes" },
      { status: 403 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createQuoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data

  // Verify vendor exists and belongs to this wedding
  const vendor = await prisma.vendorProfile.findFirst({
    where: { id: data.vendorId, weddingId: wedding.id },
  })

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
  }

  const quote = await prisma.vendorQuote.create({
    data: {
      weddingId: wedding.id,
      vendorId: data.vendorId,
      title: data.title,
      amountTotal: data.amountTotal,
      currency: data.currency,
      notes: data.notes,
      lineItems: data.lineItems,
      status: data.status,
      createdByUserId: session.user.id,
    },
    include: {
      vendor: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          type: true,
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json(quote, { status: 201 })
}
