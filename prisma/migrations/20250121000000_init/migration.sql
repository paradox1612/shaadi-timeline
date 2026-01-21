-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BRIDE', 'GROOM', 'PLANNER', 'VENDOR');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('PHOTOGRAPHER', 'VIDEOGRAPHER', 'DJ', 'CATERER', 'DECOR', 'MUA', 'OTHER');

-- CreateEnum
CREATE TYPE "TimelineVisibility" AS ENUM ('INTERNAL', 'VENDOR', 'AUDIENCE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "phone" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wedding" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationCity" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventDay" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorProfile" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "type" "VendorType" NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" VARCHAR(20),
    "email" TEXT,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineItem" (
    "id" TEXT NOT NULL,
    "eventDayId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locationName" TEXT,
    "locationAddress" TEXT,
    "locationGoogleMapsUrl" TEXT,
    "visibility" "TimelineVisibility" NOT NULL DEFAULT 'INTERNAL',
    "internalNotes" TEXT,
    "vendorNotes" TEXT,
    "audienceNotes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineItemVendor" (
    "timelineItemId" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,

    CONSTRAINT "TimelineItemVendor_pkey" PRIMARY KEY ("timelineItemId","vendorProfileId")
);

-- CreateTable
CREATE TABLE "GuestViewLink" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "GuestViewLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestViewLinkEventDay" (
    "guestViewLinkId" TEXT NOT NULL,
    "eventDayId" TEXT NOT NULL,

    CONSTRAINT "GuestViewLinkEventDay_pkey" PRIMARY KEY ("guestViewLinkId","eventDayId")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "timelineItemId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeAdjustment" (
    "id" TEXT NOT NULL,
    "eventDayId" TEXT NOT NULL,
    "fromItemId" TEXT NOT NULL,
    "adjustmentMinutes" INTEGER NOT NULL,
    "reason" TEXT,
    "appliedByUserId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "EventDay_weddingId_idx" ON "EventDay"("weddingId");

-- CreateIndex
CREATE INDEX "EventDay_date_idx" ON "EventDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_email_key" ON "VendorProfile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_userId_key" ON "VendorProfile"("userId");

-- CreateIndex
CREATE INDEX "VendorProfile_weddingId_idx" ON "VendorProfile"("weddingId");

-- CreateIndex
CREATE INDEX "VendorProfile_type_idx" ON "VendorProfile"("type");

-- CreateIndex
CREATE INDEX "TimelineItem_eventDayId_idx" ON "TimelineItem"("eventDayId");

-- CreateIndex
CREATE INDEX "TimelineItem_startTime_idx" ON "TimelineItem"("startTime");

-- CreateIndex
CREATE INDEX "TimelineItem_visibility_idx" ON "TimelineItem"("visibility");

-- CreateIndex
CREATE INDEX "TimelineItemVendor_vendorProfileId_idx" ON "TimelineItemVendor"("vendorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestViewLink_token_key" ON "GuestViewLink"("token");

-- CreateIndex
CREATE INDEX "GuestViewLink_weddingId_idx" ON "GuestViewLink"("weddingId");

-- CreateIndex
CREATE INDEX "GuestViewLinkEventDay_eventDayId_idx" ON "GuestViewLinkEventDay"("eventDayId");

-- CreateIndex
CREATE INDEX "Comment_timelineItemId_idx" ON "Comment"("timelineItemId");

-- CreateIndex
CREATE INDEX "Comment_authorUserId_idx" ON "Comment"("authorUserId");

-- CreateIndex
CREATE INDEX "TimeAdjustment_eventDayId_idx" ON "TimeAdjustment"("eventDayId");

-- CreateIndex
CREATE INDEX "TimeAdjustment_fromItemId_idx" ON "TimeAdjustment"("fromItemId");

-- CreateIndex
CREATE INDEX "TimeAdjustment_appliedAt_idx" ON "TimeAdjustment"("appliedAt");

-- AddForeignKey
ALTER TABLE "EventDay" ADD CONSTRAINT "EventDay_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_eventDayId_fkey" FOREIGN KEY ("eventDayId") REFERENCES "EventDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItemVendor" ADD CONSTRAINT "TimelineItemVendor_timelineItemId_fkey" FOREIGN KEY ("timelineItemId") REFERENCES "TimelineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItemVendor" ADD CONSTRAINT "TimelineItemVendor_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestViewLink" ADD CONSTRAINT "GuestViewLink_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestViewLinkEventDay" ADD CONSTRAINT "GuestViewLinkEventDay_guestViewLinkId_fkey" FOREIGN KEY ("guestViewLinkId") REFERENCES "GuestViewLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestViewLinkEventDay" ADD CONSTRAINT "GuestViewLinkEventDay_eventDayId_fkey" FOREIGN KEY ("eventDayId") REFERENCES "EventDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_timelineItemId_fkey" FOREIGN KEY ("timelineItemId") REFERENCES "TimelineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeAdjustment" ADD CONSTRAINT "TimeAdjustment_eventDayId_fkey" FOREIGN KEY ("eventDayId") REFERENCES "EventDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeAdjustment" ADD CONSTRAINT "TimeAdjustment_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeAdjustment" ADD CONSTRAINT "TimeAdjustment_fromItemId_fkey" FOREIGN KEY ("fromItemId") REFERENCES "TimelineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

