-- Migration: Replace emiPrice + emiLink with emiPlans (JSONB)
-- Drops the two old scalar EMI columns and adds a flexible JSON instalment plan column.

ALTER TABLE "Course" DROP COLUMN IF EXISTS "emiPrice";
ALTER TABLE "Course" DROP COLUMN IF EXISTS "emiLink";
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "emiPlans" JSONB;
