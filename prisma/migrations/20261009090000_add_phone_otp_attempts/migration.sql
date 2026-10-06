-- Counts guesses at each phone OTP so a code can't be brute-forced.
-- Adds a column with a default, so code that predates this migration keeps
-- working against a database that has it.

-- AlterTable
ALTER TABLE "PhoneOtp" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
