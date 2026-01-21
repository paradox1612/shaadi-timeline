import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { id } = await params

  // Check access
  const item = await prisma.timelineItem.findUnique({
    where: { id },
    include: {
      assignedVendors: true
    }
  })

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Vendors can only see comments on assigned items
  if (session.user.role === "VENDOR") {
    const hasAccess = item.assignedVendors.some(
      av => av.vendorProfileId === session.user.vendorProfileId
    )
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const comments = await prisma.comment.findMany({
    where: { timelineItemId: id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  })

  return NextResponse.json(comments)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { text } = body

  // Check access (same as GET)
  const item = await prisma.timelineItem.findUnique({
    where: { id },
    include: { assignedVendors: true }
  })

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (session.user.role === "VENDOR") {
    const hasAccess = item.assignedVendors.some(
      av => av.vendorProfileId === session.user.vendorProfileId
    )
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const comment = await prisma.comment.create({
    data: {
      timelineItemId: id,
      authorUserId: session.user.id,
      text
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    }
  })

  return NextResponse.json(comment, { status: 201 })
}
