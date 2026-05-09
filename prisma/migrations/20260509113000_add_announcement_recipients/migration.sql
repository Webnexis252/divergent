-- CreateTable
CREATE TABLE "AnnouncementRecipient" (
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRecipient_pkey" PRIMARY KEY ("announcementId","userId")
);

-- CreateIndex
CREATE INDEX "AnnouncementRecipient_userId_idx" ON "AnnouncementRecipient"("userId");

-- AddForeignKey
ALTER TABLE "AnnouncementRecipient"
ADD CONSTRAINT "AnnouncementRecipient_announcementId_fkey"
FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementRecipient"
ADD CONSTRAINT "AnnouncementRecipient_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
