-- Indexes for the hot paths that scan whole tables as data grows.
-- All tables involved are small today, so building them takes moments; on
-- tables with millions of rows, build indexes CONCURRENTLY outside a migration.

-- Trigram operator classes for the search indexes below.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Search: /api/search filters with ILIKE '%q%', which a B-tree can't serve.
-- CreateIndex
CREATE INDEX "Course_title_trgm_idx" ON "Course" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Course_description_trgm_idx" ON "Course" USING GIN ("description" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Lesson_title_trgm_idx" ON "Lesson" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Lesson_bodyText_trgm_idx" ON "Lesson" USING GIN ("bodyText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Assignment_title_trgm_idx" ON "Assignment" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Assignment_description_trgm_idx" ON "Assignment" USING GIN ("description" gin_trgm_ops);

-- Payments: webhook, callback and verify look orders up by gateway order id.
-- Checked before writing this migration: no duplicate order ids exist.
-- CreateIndex
CREATE UNIQUE INDEX "Payment_cashfreeOrderId_key" ON "Payment"("cashfreeOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayOrderId_key" ON "Payment"("razorpayOrderId");

-- Notifications: listed per user newest-first, and filtered by unread.
-- (userId, createdAt) also covers plain userId lookups, so the old index goes.
-- DropIndex
DROP INDEX "Notification_userId_idx";

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- Audit log: the admin page lists newest-first.
-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
