"use client"

import React, { useState, useEffect } from "react"
import { useGuest } from "@/components/guest/guest-provider"
import { Nav } from "@/components/nav"
import { Photo } from "@prisma/client"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function MyUploadsPage() {
  const { guest } = useGuest()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPhotos = async () => {
      if (guest) {
        try {
          const res = await fetch("/api/photos", {
            headers: {
              Authorization: `Bearer ${guest.token}`,
            },
          })
          if (res.ok) {
            const data = await res.json()
            setPhotos(data)
          }
        } catch (error) {
          console.error("Error fetching photos:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchPhotos()
  }, [guest])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {guest && <Nav userName={guest.name} userRole="GUEST" />}
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">My Uploads</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Here are the photos you have submitted.
            </p>
          </div>
        </div>

        {photos.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">You haven't uploaded any photos yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden">
                <div className="aspect-square relative">
                  <Image
                    src={photo.url}
                    alt={photo.caption || "Uploaded photo"}
                    layout="fill"
                    objectFit="cover"
                    unoptimized
                  />
                  <Badge
                    className="absolute top-2 right-2"
                    variant={
                      photo.status === "APPROVED"
                        ? "default"
                        : photo.status === "REJECTED"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {photo.status}
                  </Badge>
                </div>
                {photo.caption && (
                  <div className="p-2">
                    <p className="text-sm text-muted-foreground truncate">
                      {photo.caption}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
