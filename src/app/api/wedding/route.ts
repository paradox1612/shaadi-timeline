import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export async function GET() {
  const { session, error } = await requireAuth()
  if (error) return error

  const wedding = await prisma.wedding.findFirst()

  if (!wedding) {
    return NextResponse.json({ error: "Wedding not found" }, { status: 404 })
  }

  return NextResponse.json(wedding)
}

export async function PUT(request: Request) {
  const { session, error } = await requireAuth(["BRIDE", "GROOM", "PLANNER"])
  if (error) return error

  const body = await request.json()
  const { name, locationCity, timezone, startDate, endDate } = body

  const wedding = await prisma.wedding.findFirst()

  if (!wedding) {
    // Create if doesn't exist
    const newWedding = await prisma.wedding.create({
      data: { name, locationCity, timezone, startDate, endDate }
    })
    return NextResponse.json(newWedding, { status: 201 })
  }

  const updated = await prisma.wedding.update({
    where: { id: wedding.id },
    data: { name, locationCity, timezone, startDate, endDate }
  })

  return NextResponse.json(updated)
}
