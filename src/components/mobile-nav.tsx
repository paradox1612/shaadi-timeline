"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  Menu,
  LayoutDashboard,
  Calendar,
  Users,
  Link2,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"

interface MobileNavProps {
  userName: string
  userRole: string
}

export function MobileNav({ userName, userRole }: MobileNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/timeline", label: "Timeline", icon: Calendar },
    { href: "/vendors", label: "Vendors", icon: Users },
    { href: "/guest-links", label: "Guest Links", icon: Link2 },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-10 w-10 rounded-full"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0">
        <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-br from-rose-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-semibold text-lg shadow-md">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-semibold">{userName}</SheetTitle>
              <p className="text-sm text-muted-foreground capitalize">{userRole.toLowerCase()}</p>
            </div>
          </div>
        </SheetHeader>

        <nav className="flex flex-col p-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium transition-all active:scale-[0.98]",
                  isActive
                    ? "bg-rose-100 text-rose-700"
                    : "text-gray-700 hover:bg-gray-100 active:bg-gray-100"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-rose-600" : "text-gray-500")} />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className={cn("h-4 w-4", isActive ? "text-rose-400" : "text-gray-300")} />
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50/80 backdrop-blur-sm">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-12 rounded-xl"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
