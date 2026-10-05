-- New tables only; no existing table changes, so code that predates this
-- migration keeps working against a database that has it, and vice versa.

-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" TEXT NOT NULL,
    "weeklyReportOptOut" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "WeeklyReportDelivery" (
    "userId" TEXT NOT NULL,
    "weekEnding" DATE NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReportDelivery_pkey" PRIMARY KEY ("userId","weekEnding")
);

-- CreateTable
CREATE TABLE "LiveClassReminder" (
    "liveClassId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveClassReminder_pkey" PRIMARY KEY ("liveClassId","userId")
);

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
