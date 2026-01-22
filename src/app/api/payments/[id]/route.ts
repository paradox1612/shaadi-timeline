import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireWedding, isBrideOrGroom, isVendor } from "@/lib/api-helpers"
import { canViewPayments, canCreatePayments } from "@/lib/permissions"
import { updatePaymentSchema } from "@/lib/validators"

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/payments/[id] - Get a single payment
export async function GET(request: Request, { params }: RouteParams) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  const { id } = await params

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      vendor: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
          type: true,
        },
      },
      quote: {
        select: {
          id: true,
          title: true,
          amountTotal: true,
          status: true,
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  if (payment.weddingId !== wedding.id) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  // Check permission
  const { viewAll, viewOwn } = await canViewPayments(
    session.user.id,
    session.user.role,
    wedding.id,
    session.user.vendorProfileId
  )

  if (!viewAll && !viewOwn) {
    return NextResponse.json(
      { error: "You don't have permission to view this payment" },
      { status: 403 }
    )
  }

  // Vendors can only see their own payments
  if (
    !viewAll &&
    viewOwn &&
    isVendor(session.user.role) &&
    payment.vendorId !== session.user.vendorProfileId
  ) {
    return NextResponse.json(
      { error: "You don't have permission to view this payment" },
      { status: 403 }
    )
  }

  return NextResponse.json(payment)
}

// PATCH /api/payments/[id] - Update a payment
export async function PATCH(request: Request, { params }: RouteParams) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  const { id } = await params

  // Check permission (same as create for editing)
  const canCreate = await canCreatePayments(
    session.user.id,
    session.user.role,
    wedding.id
  )

  if (!canCreate) {
    return NextResponse.json(
      { error: "You don't have permission to edit payments" },
      { status: 403 }
    )
  }

  const payment = await prisma.payment.findUnique({
    where: { id },
  })

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  if (payment.weddingId !== wedding.id) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updatePaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const data = parsed.data

  // Verify vendor if changed
  if (data.vendorId !== undefined && data.vendorId !== null) {
    const vendor = await prisma.vendorProfile.findFirst({
      where: { id: data.vendorId, weddingId: wedding.id },
    })
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
    }
  }

  // Verify quote if changed
  if (data.quoteId !== undefined && data.quoteId !== null) {
    const quote = await prisma.vendorQuote.findFirst({
      where: { id: data.quoteId, weddingId: wedding.id },
    })
    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }
  }

  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: {
      vendorId: data.vendorId,
      quoteId: data.quoteId,
      amount: data.amount,
      currency: data.currency,
      paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
      method: data.method,
      note: data.note,
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

  return NextResponse.json(updatedPayment)
}

// DELETE /api/payments/[id] - Delete a payment
export async function DELETE(request: Request, { params }: RouteParams) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { wedding, error: weddingError } = await requireWedding()
  if (weddingError) return weddingError

  const { id } = await params

  // Only bride/groom can delete payments
  if (!isBrideOrGroom(session.user.role)) {
    return NextResponse.json(
      { error: "Only bride and groom can delete payments" },
      { status: 403 }
    )
  }

  const payment = await prisma.payment.findUnique({
    where: { id },
  })

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  if (payment.weddingId !== wedding.id) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  await prisma.payment.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
