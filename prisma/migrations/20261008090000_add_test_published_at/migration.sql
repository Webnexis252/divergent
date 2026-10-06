-- Adds a nullable column, so code that predates this migration keeps working
-- against a database that has it.

-- AlterTable
ALTER TABLE "CourseTest" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- Backfill tests that are already published. Their publish time was never
-- recorded, but it can't be later than their last update (publishing updates
-- the row) or their first attempt (students can only start published tests),
-- so the earlier of the two is the closest known time.
UPDATE "CourseTest" AS t
SET "publishedAt" = LEAST(
  t."updatedAt",
  (SELECT MIN(a."startedAt") FROM "TestAttempt" AS a WHERE a."testId" = t."id")
)
WHERE t."status" = 'PUBLISHED';

-- Stamp the publish time in the database, so every code path that publishes a
-- test (teacher and admin routes, scripts, future ones) records it. The first
-- publish wins: unpublishing and republishing keeps the original time.
CREATE FUNCTION "CourseTest_set_published_at"() RETURNS trigger AS $$
BEGIN
  IF NEW."status" = 'PUBLISHED' AND NEW."publishedAt" IS NULL THEN
    -- The column holds UTC like every Prisma timestamp, whatever the session time zone
    NEW."publishedAt" := now() AT TIME ZONE 'UTC';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "CourseTest_set_published_at"
BEFORE INSERT OR UPDATE OF "status" ON "CourseTest"
FOR EACH ROW EXECUTE FUNCTION "CourseTest_set_published_at"();
