import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Nav } from "@/components/nav"
import {
  CalendarDays,
  Clock,
  Users,
  Link2,
  Settings,
  ChevronRight,
  Sparkles,
  MapPin,
} from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const wedding = await prisma.wedding.findFirst()
  const eventDaysCount = await prisma.eventDay.count()
  const vendorsCount = await prisma.vendorProfile.count()
  const timelineItemsCount = await prisma.timelineItem.count()

  const stats = [
    {
      label: "Event Days",
      value: eventDaysCount,
      icon: CalendarDays,
      color: "text-rose-500",
      bg: "bg-rose-50",
    },
    {
      label: "Timeline Items",
      value: timelineItemsCount,
      icon: Clock,
      color: "text-violet-500",
      bg: "bg-violet-50",
    },
    {
      label: "Vendors",
      value: vendorsCount,
      icon: Users,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
  ]

  const quickActions = [
    {
      href: "/timeline",
      label: "Timeline",
      description: "View & edit schedule",
      icon: Clock,
      primary: true,
    },
    {
      href: "/vendors",
      label: "Vendors",
      description: "Manage vendors",
      icon: Users,
    },
    {
      href: "/guest-links",
      label: "Guest Links",
      description: "Share schedules",
      icon: Link2,
    },
    {
      href: "/settings",
      label: "Settings",
      description: "Wedding details",
      icon: Settings,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Nav userName={session.user.name} userRole={session.user.role} />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Welcome back</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">{session.user.name}</h1>
          <p className="text-muted-foreground mt-1">
            {session.user.role === "PLANNER" ? "Wedding Coordinator" : session.user.role.toLowerCase()}
          </p>
        </div>

        {/* Wedding Info Card */}
        {wedding && (
          <Card className="mb-6 border-0 shadow-md bg-gradient-to-br from-primary/5 via-primary/10 to-violet-100/50 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold gradient-text">{wedding.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <MapPin className="h-4 w-4" />
                    <span>{wedding.locationCity}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <CalendarDays className="h-4 w-4" />
                    <span>
                      {new Date(wedding.startDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {" - "}
                      {new Date(wedding.endDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${stat.bg} mb-2`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href}>
                  <Card className={`border-0 shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.99] ${action.primary ? 'bg-primary text-primary-foreground' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${action.primary ? 'bg-white/20' : 'bg-muted'}`}>
                          <Icon className={`h-5 w-5 ${action.primary ? 'text-white' : 'text-foreground'}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{action.label}</p>
                          <p className={`text-sm ${action.primary ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {action.description}
                          </p>
                        </div>
                        <ChevronRight className={`h-5 w-5 ${action.primary ? 'text-white/60' : 'text-muted-foreground/50'}`} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Getting Started Guide */}
        <Card className="border-0 shadow-sm bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ol className="space-y-3">
              {[
                { step: 1, text: "Set up your wedding details in Settings", done: !!wedding },
                { step: 2, text: "Add your event days (Mehendi, Sangeet, etc.)", done: eventDaysCount > 0 },
                { step: 3, text: "Add vendors to your wedding", done: vendorsCount > 0 },
                { step: 4, text: "Create timeline items for each day", done: timelineItemsCount > 0 },
                { step: 5, text: "Generate guest links to share schedules", done: false },
              ].map((item) => (
                <li key={item.step} className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                    item.done
                      ? 'bg-green-100 text-green-700'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {item.done ? '✓' : item.step}
                  </div>
                  <span className={`text-sm ${item.done ? 'text-muted-foreground line-through' : ''}`}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
