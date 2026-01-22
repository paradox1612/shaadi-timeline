import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireWedding, isVendor } from "@/lib/api-helpers"
import { canViewPayments, canCreatePayments } from "@/lib/permissions"
import { createPaymentSchema } from "@/lib/validators"

// GET /api/payments - List payments
export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  // Check permission
  const { viewAll, viewOwn } = await canViewPayments(
    session.user.id,
    session.user.role,
    wedding.id,
    session.user.vendorProfileId
  )

  if (!viewAll && !viewOwn) {
    return NextResponse.json(
      { error: "You don't have permission to view payments" },
      { status: 403 }
    )
  }

  // Build where clause based on permissions
  const where: { weddingId: string; vendorId?: string } = { weddingId: wedding.id }

  // If can only view own (vendor case), filter by vendor
  if (!viewAll && viewOwn && session.user.vendorProfileId) {
    where.vendorId = session.user.vendorProfileId
  }

  const payments = await prisma.payment.findMany({
    where,
    include: {
      vendor: {
        select: {
          id: true,
          companyName: true,
          type: true,
        },
      },
      quote: {
        select: {
          id: true,
          title: true,
          amountTotal: true,
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { paidAt: "desc" },
  })

  return NextResponse.json(payments)
}

// POST /api/payments - Create a new payment
export async function POST(request: Request) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  // Check permission
  const canCreate = await canCreatePayments(
    session.user.id,
    session.user.role,
    wedding.id
  )

  if (!canCreate) {
    return NextResponse.json(
      { error: "You don't have permission to create payments" },
      { status: 403 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data

  // Verify vendor exists if provided
  if (data.vendorId) {
    const vendor = await prisma.vendorProfile.findFirst({
      where: { id: data.vendorId, weddingId: wedding.id },
    })
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    }
  }

  // Verify quote exists if provided
  if (data.quoteId) {
    const quote = await prisma.vendorQuote.findFirst({
      where: { id: data.quoteId, weddingId: wedding.id },
    })
    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }
    // If quote is linked, ensure vendor matches
    if (data.vendorId && quote.vendorId !== data.vendorId) {
      return NextResponse.json(
        { error: "Quote vendor does not match specified vendor" },
        { status: 400 }
      )
    }
    // Auto-set vendor from quote if not provided
    if (!data.vendorId) {
      data.vendorId = quote.vendorId
    }
  }

  const payment = await prisma.payment.create({
    data: {
      weddingId: wedding.id,
      vendorId: data.vendorId,
      quoteId: data.quoteId,
      amount: data.amount,
      currency: data.currency,
      paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
      method: data.method,
      note: data.note,
      createdByUserId: session.user.id,
    },
    include: {
      vendor: {
        select: {
          id: true,
          companyName: true,
          type: true,
        },
      },
      quote: {
        select: {
          id: true,
          title: true,
          amountTotal: true,
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json(payment, { status: 201 })
}
