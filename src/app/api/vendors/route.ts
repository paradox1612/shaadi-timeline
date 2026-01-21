import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export async function GET() {
  const { session, error } = await requireAuth(["BRIDE", "GROOM", "PLANNER"])
  if (error) return error

  const wedding = await prisma.wedding.findFirst()
  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 })
  }

  const vendors = await prisma.vendorProfile.findMany({
    where: { weddingId: wedding.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { companyName: "asc" }
  })

  return NextResponse.json(vendors)
}

export async function POST(request: Request) {
  const { session, error } = await requireAuth(["BRIDE", "GROOM", "PLANNER"])
  if (error) return error

  const wedding = await prisma.wedding.findFirst()
  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 })
  }

  const body = await request.json()
  const { type, companyName, contactName, phone, email, notes } = body

  const vendor = await prisma.vendorProfile.create({
    data: {
      weddingId: wedding.id,
      type,
      companyName,
      contactName,
      phone,
      email,
      notes
    }
  })

  return NextResponse.json(vendor, { status: 201 })
}
