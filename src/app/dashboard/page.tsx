import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Nav } from "@/components/nav"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const wedding = await prisma.wedding.findFirst()
  const eventDaysCount = await prisma.eventDay.count()
  const vendorsCount = await prisma.vendorProfile.count()
  const timelineItemsCount = await prisma.timelineItem.count()

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav userName={session.user.name} userRole={session.user.role} />

      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Welcome, {session.user.name}!</h1>
          <p className="text-muted-foreground">Manage your wedding timeline</p>
        </div>

        {wedding && (
          <div className="mb-6 p-4 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg">
            <h2 className="text-xl font-semibold">{wedding.name}</h2>
            <p className="text-sm text-muted-foreground">
              {wedding.locationCity} &bull;{" "}
              {new Date(wedding.startDate).toLocaleDateString()} -{" "}
              {new Date(wedding.endDate).toLocaleDateString()}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Event Days</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{eventDaysCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Timeline Items</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{timelineItemsCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Vendors</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{vendorsCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold capitalize">
                {session.user.role.toLowerCase()}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/timeline">View Timeline</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/vendors">Manage Vendors</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/guest-links">Guest Links</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/settings">Wedding Settings</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>1. Set up your wedding details in Settings</li>
                <li>2. Add your event days (Mehendi, Sangeet, Wedding, etc.)</li>
                <li>3. Add vendors to your wedding</li>
                <li>4. Create timeline items for each day</li>
                <li>5. Generate guest links to share schedules</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
