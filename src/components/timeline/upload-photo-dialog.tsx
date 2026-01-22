"use client"

import React, { useState, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useGuest } from "@/components/guest/guest-provider"
import { Camera, X, CheckCircle2, Plus, ImageIcon } from "lucide-react"
import { GuestNamePrompt } from "@/components/guest/guest-name-prompt"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface UploadPhotoDialogProps {
  timelineItemId: string
  onUploadComplete: () => void
}

interface FileWithPreview {
  file: File
  preview: string
  id: string
}

export const UploadPhotoDialog = ({
  timelineItemId,
  onUploadComplete,
}: UploadPhotoDialogProps) => {
  const { guest } = useGuest()
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [showNamePrompt, setShowNamePrompt] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substring(7),
      }))
      setFiles((prev) => [...prev, ...newFiles])
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const handleClose = useCallback(() => {
    // Cleanup previews
    files.forEach((f) => URL.revokeObjectURL(f.preview))
    setFiles([])
    setUploadSuccess(false)
    setUploadProgress(0)
    setIsOpen(false)
  }, [files])

  const handleSubmit = async () => {
    if (files.length === 0) return

    if (!guest) {
      setShowNamePrompt(true)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    const totalFiles = files.length
    let uploaded = 0

    try {
      for (const { file } of files) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("timelineItemId", timelineItemId)

        const res = await fetch("/api/photos", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${guest.token}`,
          },
          body: formData,
        })

        if (res.ok) {
          uploaded++
          setUploadProgress(Math.round((uploaded / totalFiles) * 100))
        } else {
          console.error("Failed to upload photo")
        }
      }

      if (uploaded > 0) {
        onUploadComplete()
        setUploadSuccess(true)
        // Cleanup previews
        files.forEach((f) => URL.revokeObjectURL(f.preview))
        setFiles([])
        setTimeout(() => {
          handleClose()
        }, 2000)
      }
    } catch (error) {
      console.error("Error uploading photos:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <>
      <GuestNamePrompt
        open={showNamePrompt}
        onOpenChange={setShowNamePrompt}
        onSuccess={() => {
          setShowNamePrompt(false)
        }}
      />
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) handleClose()
        else setIsOpen(true)
      }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Camera className="h-4 w-4" />
            <span>Add Photo</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden" showCloseButton={false}>
          {uploadSuccess ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-1">Photos Uploaded</h2>
              <p className="text-muted-foreground text-center text-sm">
                Your photos are pending approval
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/80">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="text-primary font-medium hover:bg-transparent"
                >
                  Cancel
                </Button>
                <span className="font-semibold">Add Photos</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={files.length === 0 || isUploading}
                  className={cn(
                    "font-semibold hover:bg-transparent",
                    files.length > 0 && !isUploading
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {isUploading ? `${uploadProgress}%` : "Upload"}
                </Button>
              </div>

              {/* Content */}
              <div className="p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />

                {files.length === 0 ? (
                  /* Empty state */
                  <button
                    onClick={triggerFileInput}
                    className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center gap-3 hover:bg-gray-100/50 hover:border-gray-300 transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <ImageIcon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900">Tap to select photos</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        You can select multiple
                      </p>
                    </div>
                  </button>
                ) : (
                  /* Photo grid */
                  <div className="space-y-3">
                    <div className={cn(
                      "grid gap-2",
                      files.length === 1 ? "grid-cols-1" :
                      files.length === 2 ? "grid-cols-2" :
                      "grid-cols-3"
                    )}>
                      {files.map((fileWithPreview) => (
                        <div
                          key={fileWithPreview.id}
                          className={cn(
                            "relative rounded-xl overflow-hidden bg-gray-100",
                            files.length === 1 ? "aspect-[4/3]" : "aspect-square"
                          )}
                        >
                          <Image
                            src={fileWithPreview.preview}
                            alt="Preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <button
                            onClick={() => removeFile(fileWithPreview.id)}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ))}
                      {/* Add more button */}
                      <button
                        onClick={triggerFileInput}
                        className={cn(
                          "rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex items-center justify-center hover:bg-gray-100/50 hover:border-gray-300 transition-colors",
                          files.length === 1 ? "aspect-[4/3]" : "aspect-square"
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Plus className="h-6 w-6 text-gray-400" />
                          <span className="text-xs text-muted-foreground">Add More</span>
                        </div>
                      </button>
                    </div>

                    {/* Upload progress bar */}
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-center text-muted-foreground">
                          Uploading {files.length} photo{files.length > 1 ? "s" : ""}...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
