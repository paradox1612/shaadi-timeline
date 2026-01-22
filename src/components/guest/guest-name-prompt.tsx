"use client"

import React, { useState } from "react"
import { useGuest } from "./guest-provider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface GuestNamePromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  required?: boolean
}

export const GuestNamePrompt = ({ open, onOpenChange, onSuccess, required = false }: GuestNamePromptProps) => {
  const { setGuestName } = useGuest()
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      setIsSubmitting(true)
      await setGuestName(name.trim())
      setIsSubmitting(false)
      onOpenChange(false)
      onSuccess?.()
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (required && !newOpen) {
      return
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!required} onInteractOutside={required ? (e) => e.preventDefault() : undefined}>
        <DialogHeader>
          <DialogTitle>Welcome!</DialogTitle>
          <DialogDescription>
            Please enter your name to join the celebration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Saving..." : "Continue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
