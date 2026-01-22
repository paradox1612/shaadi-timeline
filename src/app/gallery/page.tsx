"use client"

import React, { useState, useEffect } from "react"
import { useGuest } from "@/components/guest/guest-provider"
import { Nav } from "@/components/nav"
import { Photo, Guest, TimelineItem } from "@prisma/client"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSession } from "next-auth/react"

type GalleryPhoto = Photo & {
  guest: { name: string }
  timelineItem: { id: string; title: string } | null
}

export default function GalleryPage() {
  const { data: session, status: sessionStatus } = useSession()
  const { guest, isLoading: isGuestLoading } = useGuest()
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await fetch("/api/gallery/photos")
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

    fetchPhotos()
  }, [])

  const currentUser = session?.user || guest
  const userRole = session?.user.role || (guest ? "GUEST" : "")

  const isLoading = sessionStatus === "loading" || isGuestLoading || loading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  const PhotoGrid = ({
    photoList,
    title,
  }: {
    photoList: GalleryPhoto[]
    title?: string
  }) => (
    <div>
      {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const MomentsView = () => {
    const photosByMoment = photos.reduce((acc, photo) => {
      const key = photo.timelineItem?.id || "uncategorized"
      if (!acc[key]) {
        acc[key] = {
          title: photo.timelineItem?.title || "Uncategorized",
          photos: [],
        }
      }
      acc[key].photos.push(photo)
      return acc
    }, {} as Record<string, { title: string; photos: GalleryPhoto[] }>)

    return (
      <div className="space-y-8">
        {Object.values(photosByMoment).map((moment) => (
          <PhotoGrid
            key={moment.title}
            title={moment.title}
            photoList={moment.photos}
          />
        ))}
      </div>
    )
  }

  const GuestsView = () => {
    const photosByGuest = photos.reduce((acc, photo) => {
      const key = photo.guest.name
      if (!acc[key]) {
        acc[key] = {
          title: key,
          photos: [],
        }
      }
      acc[key].photos.push(photo)
      return acc
    }, {} as Record<string, { title: string; photos: GalleryPhoto[] }>)

    return (
      <div className="space-y-8">
        {Object.values(photosByGuest).map((guest) => (
          <PhotoGrid
            key={guest.title}
            title={guest.title}
            photoList={guest.photos}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {currentUser && <Nav userName={currentUser.name || ""} userRole={userRole} />}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Photo Gallery</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Photos from the celebration.
            </p>
          </div>
        </div>

        <Tabs defaultValue="latest">
          <TabsList>
            <TabsTrigger value="moments">Moments</TabsTrigger>
            <TabsTrigger value="latest">Latest</TabsTrigger>
            <TabsTrigger value="guests">Guests</TabsTrigger>
          </TabsList>
          <TabsContent value="moments" className="mt-4">
            <MomentsView />
          </TabsContent>
          <TabsContent value="latest" className="mt-4">
            <PhotoGrid photoList={photos} />
          </TabsContent>
          <TabsContent value="guests" className="mt-4">
            <GuestsView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
