"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MobileNav } from "@/components/mobile-nav"

interface NavProps {
  userName: string
  userRole: string
}

export function Nav({ userName, userRole }: NavProps) {
  const pathname = usePathname()

  // Roles that can see all navigation items
  const isInternalUser = ["BRIDE", "GROOM", "PLANNER", "BRIDE_PARENT", "GROOM_PARENT", "FAMILY_HELPER"].includes(userRole)
  const isBrideOrGroom = userRole === "BRIDE" || userRole === "GROOM"
  const isPlanner = userRole === "PLANNER"

  // Build nav items based on role
  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/tasks", label: "Tasks" },
    { href: "/timeline", label: "Timeline" },
    ...(isInternalUser ? [{ href: "/budget", label: "Budget" }] : []),
    ...(isBrideOrGroom || isPlanner ? [{ href: "/vendors", label: "Vendors" }] : []),
    ...(isBrideOrGroom || isPlanner ? [{ href: "/guest-links", label: "Guest Links" }] : []),
    { href: "/settings", label: "Settings" },
  ]

  return (
    <nav className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Logo and Mobile Nav */}
          <div className="flex items-center gap-3">
            <MobileNav userName={userName} userRole={userRole} />
            <Link
              href="/dashboard"
              className="text-xl font-bold gradient-text"
            >
              ShaadiTimeline
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side - User info (Desktop) */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white font-medium text-sm shadow-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm text-right">
                <p className="font-medium leading-tight">{userName}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole.toLowerCase()}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-muted-foreground hover:text-foreground"
            >
              Sign Out
            </Button>
          </div>

          {/* Mobile - Just show avatar */}
          <div className="flex md:hidden items-center">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white font-medium text-sm shadow-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
