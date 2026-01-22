# Implementation Progress

## Done

- **Database Schema for Photo Sharing**:
  - Added `Guest` and `Photo` models to `prisma/schema.prisma`.
  - Added `PhotoStatus` enum.
  - Added relations to `User`, `Wedding`, and `TimelineItem` models.
  - Created and applied the database migration.
- **Guest Identification**:
  - Implemented a simple guest identification system using a token stored in local storage.
  - Created a `GuestProvider` to manage guest state.
  - Added a prompt for guests to enter their name.
- **Photo Uploads**:
  - Created an API endpoint for photo uploads.
  - Added a camera button to timeline event cards for guests to upload photos.
  - Implemented a success message after photo upload.
  - **S3 Integration**: Implemented AWS S3 storage for photos with a fallback to local filesystem storage if S3 credentials are not provided.
  - **Docker S3 Support**: Added MinIO service to `docker-compose.yml` for local S3 compatibility.
- **My Uploads Page**:
  - Created a page for guests to see their own submitted photos.
- **Admin Photo Moderation**:
  - Added permissions for photo management.
  - Created API endpoints for admins to fetch and moderate photos.
  - Created a photo moderation page for admins with "Pending", "Approved", and "Rejected" queues.
  - Fixed TypeScript errors regarding `params` in dynamic API routes.
  - Fixed 500 errors during approval/rejection caused by stale user sessions (added DB check in `requireAuth`).
- **Photo Gallery**:
  - Created an API endpoint to fetch approved photos for the gallery.
  - Created a gallery page with "Latest", "Moments", and "Guests" tabs.
  - Implemented navigation links to the gallery for all users.
- **Guest View Refactor**:
  - Moved guest photo upload functionality to the dedicated `guest/[token]` page.
  - Cleaned up the main timeline page to focus on authenticated users.
  - Fixed "sync-dynamic-apis" errors in client components.

## In Progress

- (None)

## To Do

- (None)
