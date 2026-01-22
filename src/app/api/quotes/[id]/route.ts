import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireWedding, isVendor, isBrideOrGroom } from "@/lib/api-helpers"
import { canViewQuotes, canManageQuotes } from "@/lib/permissions"
import { updateQuoteSchema } from "@/lib/validators"

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/quotes/[id] - Get a single quote
export async function GET(request: Request, { params }: RouteParams) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  const { id } = await params

  const quote = await prisma.vendorQuote.findUnique({
    where: { id },
    include: {
      vendor: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          phone: true,
          type: true,
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      payments: {
        include: {
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { paidAt: "desc" },
      },
    },
  })

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 })
  }

  if (quote.weddingId !== wedding.id) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 })
  }

  // Check permission
  const canView = await canViewQuotes(
    session.user.id,
    session.user.role,
    wedding.id,
    session.user.vendorProfileId
  )

  if (!canView) {
    return NextResponse.json(
      { error: "You don't have permission to view this quote" },
      { status: 403 }
    )
  }

  // Vendors can only see their own quotes
  if (isVendor(session.user.role) && quote.vendorId !== session.user.vendorProfileId) {
    return NextResponse.json(
      { error: "You don't have permission to view this quote" },
      { status: 403 }
    )
  }

  const totalPaid = quote.payments.reduce((sum, p) => sum + p.amount, 0)

  return NextResponse.json({
    ...quote,
    totalPaid,
    remaining: quote.amountTotal - totalPaid,
  })
}

// PATCH /api/quotes/[id] - Update a quote
export async function PATCH(request: Request, { params }: RouteParams) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  const { id } = await params

  // Check permission
  const canManage = await canManageQuotes(
    session.user.id,
    session.user.role,
    wedding.id
  )

  if (!canManage) {
    return NextResponse.json(
      { error: "You don't have permission to edit quotes" },
      { status: 403 }
    )
  }

  const quote = await prisma.vendorQuote.findUnique({
    where: { id },
  })

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 })
  }

  if (quote.weddingId !== wedding.id) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateQuoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data

  const updatedQuote = await prisma.vendorQuote.update({
    where: { id },
    data: {
      title: data.title,
      amountTotal: data.amountTotal,
      currency: data.currency,
      notes: data.notes,
      lineItems: data.lineItems,
      status: data.status,
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
      payments: {
        select: {
          id: true,
          amount: true,
          currency: true,
          paidAt: true,
          method: true,
        },
      },
    },
  })

  const totalPaid = updatedQuote.payments.reduce((sum, p) => sum + p.amount, 0)

  return NextResponse.json({
    ...updatedQuote,
    totalPaid,
    remaining: updatedQuote.amountTotal - totalPaid,
  })
}

// DELETE /api/quotes/[id] - Delete a quote
export async function DELETE(request: Request, { params }: RouteParams) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  const { id } = await params

  // Only bride/groom can delete quotes
  if (!isBrideOrGroom(session.user.role)) {
    return NextResponse.json(
      { error: "Only bride and groom can delete quotes" },
      { status: 403 }
    )
  }

  const quote = await prisma.vendorQuote.findUnique({
    where: { id },
    include: { _count: { select: { payments: true } } },
  })

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 })
  }

  if (quote.weddingId !== wedding.id) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 })
  }

  // Warn if there are payments linked
  if (quote._count.payments > 0) {
    return NextResponse.json(
      {
        error: "Cannot delete quote with linked payments. Remove payments first.",
      },
      { status: 400 }
    )
  }

  await prisma.vendorQuote.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
