"use client"

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react"
import { Guest } from "@prisma/client"

interface GuestContextType {
  guest: Guest | null
  isLoading: boolean
  setGuestName: (name: string) => Promise<void>
}

const GuestContext = createContext<GuestContextType | undefined>(undefined)

export const GuestProvider = ({ children }: { children: ReactNode }) => {
  const [guest, setGuest] = useState<Guest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const verifyGuest = async () => {
      const token = localStorage.getItem("guest_token")
      if (token) {
        try {
          const res = await fetch(`/api/guests?token=${token}`)
          if (res.ok) {
            const guestData = await res.json()
            setGuest(guestData)
          } else {
            localStorage.removeItem("guest_token")
          }
        } catch (error) {
          console.error("Error verifying guest:", error)
          localStorage.removeItem("guest_token")
        }
      }
      setIsLoading(false)
    }

    verifyGuest()
  }, [])

  const setGuestName = async (name: string) => {
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (res.ok) {
        const newGuest = await res.json()
        setGuest(newGuest)
        localStorage.setItem("guest_token", newGuest.token)
      } else {
        // Handle error
        console.error("Failed to create guest")
      }
    } catch (error) {
      console.error("Error setting guest name:", error)
    }
  }

  // Treat as loading until mounted to avoid hydration issues
  const effectiveIsLoading = !mounted || isLoading

  return (
    <GuestContext.Provider value={{ guest, isLoading: effectiveIsLoading, setGuestName }}>
      {children}
    </GuestContext.Provider>
  )
}

export const useGuest = () => {
  const context = useContext(GuestContext)
  if (context === undefined) {
    throw new Error("useGuest must be used within a GuestProvider")
  }
  return context
}
