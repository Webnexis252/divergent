-- New table only; no existing table changes, so code that predates this
-- migration keeps working against a database that has it. The Python job in
-- services/question-analytics fills it nightly; the app only reads it.

-- CreateTable
CREATE TABLE "QuestionStat" (
    "questionId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "studentCount" INTEGER NOT NULL,
    "answeredCount" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "difficulty" DOUBLE PRECISION,
    "discrimination" DOUBLE PRECISION,
    "answerCounts" JSONB NOT NULL,
    "flags" TEXT[],
    "computedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionStat_pkey" PRIMARY KEY ("questionId")
);

-- CreateIndex
CREATE INDEX "QuestionStat_testId_idx" ON "QuestionStat"("testId");

-- AddForeignKey
ALTER TABLE "QuestionStat" ADD CONSTRAINT "QuestionStat_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "TestQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionStat" ADD CONSTRAINT "QuestionStat_testId_fkey" FOREIGN KEY ("testId") REFERENCES "CourseTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

