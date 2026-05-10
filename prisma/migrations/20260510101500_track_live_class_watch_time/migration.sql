-- AlterTable
ALTER TABLE "Attendance"
ADD COLUMN "watchTimeSecs" INTEGER NOT NULL DEFAULT 0;

-- Backfill per-class watched time from historical join/leave timestamps.
UPDATE "Attendance" AS attendance
SET "watchTimeSecs" = GREATEST(
    0,
    FLOOR(
      EXTRACT(
        EPOCH FROM (
          COALESCE(attendance."leaveAt", live_class."endedAt") - attendance."joinedAt"
        )
      )
    )::INTEGER
  )
FROM "LiveClass" AS live_class
WHERE attendance."liveClassId" = live_class."id"
  AND COALESCE(attendance."leaveAt", live_class."endedAt") IS NOT NULL;

-- Backfill each student's aggregate study time with historical live-class watch time.
WITH attendance_totals AS (
  SELECT "userId", COALESCE(SUM("watchTimeSecs"), 0)::INTEGER AS "watchTimeSecs"
  FROM "Attendance"
  GROUP BY "userId"
)
UPDATE "User" AS users
SET "totalStudyTime" = users."totalStudyTime" + attendance_totals."watchTimeSecs"
FROM attendance_totals
WHERE users."id" = attendance_totals."userId";
