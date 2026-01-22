"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Nav } from "@/components/nav"
import { Photo, Guest } from "@prisma/client"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type PhotoWithGuest = Photo & {
  guest: {
    name: string
  }
}

export default function PhotoAdminPage() {
  const { data: session, status } = useSession()
  const [photos, setPhotos] = useState<PhotoWithGuest[]>([])
  const [loading, setLoading] = useState(true)
  const [hasPermission, setHasPermission] = useState(false)

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/photos")
      if (res.ok) {
        const data = await res.json()
        setPhotos(data)
      }
    } catch (error) {
      console.error("Error fetching photos:", error)
    }
  }, [])

  useEffect(() => {
    const checkPermission = async () => {
      if (status === "authenticated") {
        const res = await fetch("/api/wedding")
        const wedding = await res.json()
        const permRes = await fetch(
          `/api/permissions?capability=photos.manage_any&weddingId=${wedding.id}`
        )
        const permData = await permRes.json()
        setHasPermission(permData.hasPermission)
        if (permData.hasPermission) {
          await fetchPhotos()
        }
        setLoading(false)
      } else if (status === "unauthenticated") {
        setLoading(false)
      }
    }
    checkPermission()
  }, [status, fetchPhotos])

  const handleUpdateStatus = async (photoId: string, newStatus: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch(`/api/admin/photos/${photoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setPhotos((prevPhotos) =>
          prevPhotos.map((p) =>
            p.id === photoId ? { ...p, status: newStatus } : p
          )
        )
      }
    } catch (error) {
      console.error("Error updating photo status:", error)
    }
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  if (!session || !hasPermission) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <p className="text-destructive">
            You do not have permission to view this page.
          </p>
        </div>
      </div>
    )
  }

  const pendingPhotos = photos.filter((p) => p.status === "PENDING")
  const approvedPhotos = photos.filter((p) => p.status === "APPROVED")
  const rejectedPhotos = photos.filter((p) => p.status === "REJECTED")

  const PhotoGrid = ({ photoList }: { photoList: PhotoWithGuest[] }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photoList.map((photo) => (
        <Card key={photo.id} className="overflow-hidden">
          <div className="aspect-square relative">
            <Image
              src={photo.url}
              alt={photo.caption || "Uploaded photo"}
              layout="fill"
              objectFit="cover"
              unoptimized
            />
          </div>
          <CardContent className="p-3">
            <p className="text-sm text-muted-foreground truncate">
              by {photo.guest.name}
            </p>
            {photo.caption && (
              <p className="text-sm mt-1 truncate">{photo.caption}</p>
            )}
            <div className="flex gap-2 mt-3">
              {photo.status !== "APPROVED" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateStatus(photo.id, "APPROVED")}
                >
                  Approve
                </Button>
              )}
              {photo.status !== "REJECTED" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleUpdateStatus(photo.id, "REJECTED")}
                >
                  Reject
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Nav userName={session.user.name} userRole={session.user.role} />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Photo Moderation</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Approve or reject photos uploaded by guests.
            </p>
          </div>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending <Badge className="ml-2">{pendingPhotos.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved <Badge className="ml-2">{approvedPhotos.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected <Badge className="ml-2">{rejectedPhotos.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">
            <PhotoGrid photoList={pendingPhotos} />
          </TabsContent>
          <TabsContent value="approved" className="mt-4">
            <PhotoGrid photoList={approvedPhotos} />
          </TabsContent>
          <TabsContent value="rejected" className="mt-4">
            <PhotoGrid photoList={rejectedPhotos} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
