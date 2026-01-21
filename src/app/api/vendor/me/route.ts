import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/api-helpers"

export async function GET() {
  const { session, error } = await requireAuth(["VENDOR"])
  if (error) return error

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      vendorProfile: true
    }
  })

  if (!user?.vendorProfile) {
    return NextResponse.json({ error: "Vendor profile not found" }, { status: 404 })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    vendorProfile: user.vendorProfile
  })
}
