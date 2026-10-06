-- New table only; no existing table changes, so code that predates this
-- migration keeps working against a database that has it.

-- CreateTable
CREATE TABLE "WeeklyStudyTime" (
    "userId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "seconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WeeklyStudyTime_pkey" PRIMARY KEY ("userId","weekStart")
);

-- AddForeignKey
ALTER TABLE "WeeklyStudyTime" ADD CONSTRAINT "WeeklyStudyTime_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
