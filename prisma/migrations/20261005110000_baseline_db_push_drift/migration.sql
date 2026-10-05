-- Baseline: schema changes that reached production through `prisma db push`
-- and were never recorded as migrations (generated with `prisma migrate diff`
-- from the history up to 20260606143000 to the schema, minus the indexes that
-- 20261005120000_add_scale_indexes creates itself).
--
-- With it, `prisma migrate deploy` builds a complete database from scratch
-- (staging, CI, disaster recovery). Production already has all of this:
-- there it must be recorded as applied, NOT run:
--   npx prisma migrate resolve --applied 20261005110000_baseline_db_push_drift

-- CreateEnum
CREATE TYPE "ApprovalRequestType" AS ENUM ('CREATE', 'SUSPEND', 'DELETE', 'EXTEND_INSTALLMENT');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'USED');

-- AlterEnum
ALTER TYPE "QuestionType" ADD VALUE 'MULTIPLE_RESPONSE';

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_actorId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "actorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Coupon" DROP COLUMN "discountPercent",
ADD COLUMN     "applicableCourseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "discountType" TEXT NOT NULL DEFAULT 'PERCENTAGE',
ADD COLUMN     "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "limitPerLearner" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "maxDiscount" DOUBLE PRECISION,
ADD COLUMN     "minPurchase" DOUBLE PRECISION,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "targetUsers" TEXT NOT NULL DEFAULT 'ALL';

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "autoCalculateRating" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "autoUpdateEnrolled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "courseLevel" TEXT,
ADD COLUMN     "courseRating" DOUBLE PRECISION,
ADD COLUMN     "enrolledStudents" INTEGER,
ADD COLUMN     "examCount" INTEGER,
ADD COLUMN     "faqs" JSONB,
ADD COLUMN     "features" JSONB,
ADD COLUMN     "language" TEXT,
ADD COLUMN     "learningOutcomes" JSONB,
ADD COLUMN     "lessonCount" INTEGER,
ADD COLUMN     "maxSeats" INTEGER,
ADD COLUMN     "originalPrice" DOUBLE PRECISION,
ADD COLUMN     "overviewContent" TEXT,
ADD COLUMN     "pricingType" TEXT NOT NULL DEFAULT 'PAID',
ADD COLUMN     "publishDate" TIMESTAMP(3),
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "testimonials" JSONB,
ADD COLUMN     "totalHours" DOUBLE PRECISION,
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "DoubtTicket" ADD COLUMN     "attachmentUrl" TEXT;

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "bundleId" TEXT,
ADD COLUMN     "currentInstallment" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isInstallmentBased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "InstituteSettings" ADD COLUMN     "requirePayment" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "LiveClass" ADD COLUMN     "teacherId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "bundleId" TEXT,
ADD COLUMN     "cashfreeOrderId" TEXT,
ADD COLUMN     "cashfreePaymentId" TEXT,
ADD COLUMN     "installmentIndex" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "paymentGateway" TEXT NOT NULL DEFAULT 'CASHFREE',
ADD COLUMN     "receiptUrl" TEXT,
ADD COLUMN     "referenceNumber" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "replyToId" TEXT;

-- AlterTable
ALTER TABLE "TeacherResource" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "liveClassId" TEXT;

-- AlterTable
ALTER TABLE "TestAttempt" ADD COLUMN     "partProgress" JSONB;

-- AlterTable
ALTER TABLE "TestQuestion" ADD COLUMN     "allowPartialMarking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "explanationImageUrl" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "negativeMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "partId" TEXT,
ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isInstallmentBased" BOOLEAN NOT NULL DEFAULT false,
    "emiPlans" JSONB,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleCourse" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,

    CONSTRAINT "BundleCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPart" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationMins" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TestPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSection" (
    "id" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL DEFAULT 'SCQ',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TestSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestQuestionGroup" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TestQuestionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'unknown',
    "appType" TEXT NOT NULL DEFAULT 'student',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentApprovalRequest" (
    "id" TEXT NOT NULL,
    "type" "ApprovalRequestType" NOT NULL DEFAULT 'CREATE',
    "targetUserId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "requestedBy" TEXT NOT NULL,
    "courseId" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherApprovalRequest" (
    "id" TEXT NOT NULL,
    "type" "ApprovalRequestType" NOT NULL DEFAULT 'CREATE',
    "targetUserId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "requestedBy" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataExportRequest" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataExportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGoal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "target" INTEGER NOT NULL DEFAULT 1,
    "current" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneOtp" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BundleCourseTeachers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BundleCourseTeachers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bundle_slug_key" ON "Bundle"("slug");

-- CreateIndex
CREATE INDEX "BundleCourse_bundleId_idx" ON "BundleCourse"("bundleId");

-- CreateIndex
CREATE INDEX "BundleCourse_courseId_idx" ON "BundleCourse"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "BundleCourse_bundleId_courseId_key" ON "BundleCourse"("bundleId", "courseId");

-- CreateIndex
CREATE INDEX "TestPart_testId_idx" ON "TestPart"("testId");

-- CreateIndex
CREATE INDEX "TestSection_partId_idx" ON "TestSection"("partId");

-- CreateIndex
CREATE INDEX "TestQuestionGroup_sectionId_idx" ON "TestQuestionGroup"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
CREATE INDEX "StudentApprovalRequest_requestedBy_idx" ON "StudentApprovalRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "TeacherApprovalRequest_requestedBy_idx" ON "TeacherApprovalRequest"("requestedBy");

-- CreateIndex
CREATE INDEX "DataExportRequest_adminId_idx" ON "DataExportRequest"("adminId");

-- CreateIndex
CREATE INDEX "StudentGoal_studentId_weekStart_idx" ON "StudentGoal"("studentId", "weekStart");

-- CreateIndex
CREATE INDEX "PhoneOtp_phone_idx" ON "PhoneOtp"("phone");

-- CreateIndex
CREATE INDEX "_BundleCourseTeachers_B_index" ON "_BundleCourseTeachers"("B");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_studentId_submittedAt_idx" ON "AssignmentSubmission"("studentId", "submittedAt");

-- CreateIndex
CREATE INDEX "Attendance_userId_isCounted_idx" ON "Attendance"("userId", "isCounted");

-- CreateIndex
CREATE INDEX "Attendance_userId_joinedAt_idx" ON "Attendance"("userId", "joinedAt");

-- CreateIndex
CREATE INDEX "Enrollment_bundleId_idx" ON "Enrollment"("bundleId");

-- CreateIndex
CREATE INDEX "LessonProgress_userId_idx" ON "LessonProgress"("userId");

-- CreateIndex
CREATE INDEX "LessonProgress_userId_updatedAt_idx" ON "LessonProgress"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "LiveClass_courseId_startTime_idx" ON "LiveClass"("courseId", "startTime");

-- CreateIndex
CREATE INDEX "Payment_bundleId_idx" ON "Payment"("bundleId");

-- CreateIndex
CREATE INDEX "TeacherResource_courseId_idx" ON "TeacherResource"("courseId");

-- CreateIndex
CREATE INDEX "TeacherResource_liveClassId_idx" ON "TeacherResource"("liveClassId");

-- CreateIndex
CREATE INDEX "TestAttempt_userId_submittedAt_idx" ON "TestAttempt"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "TestAttempt_testId_score_idx" ON "TestAttempt"("testId", "score");

-- CreateIndex
CREATE INDEX "TestQuestion_partId_idx" ON "TestQuestion"("partId");

-- CreateIndex
CREATE INDEX "TestQuestion_sectionId_idx" ON "TestQuestion"("sectionId");

-- CreateIndex
CREATE INDEX "TestQuestion_groupId_idx" ON "TestQuestion"("groupId");

-- AddForeignKey
ALTER TABLE "BundleCourse" ADD CONSTRAINT "BundleCourse_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleCourse" ADD CONSTRAINT "BundleCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPart" ADD CONSTRAINT "TestPart_testId_fkey" FOREIGN KEY ("testId") REFERENCES "CourseTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSection" ADD CONSTRAINT "TestSection_partId_fkey" FOREIGN KEY ("partId") REFERENCES "TestPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestionGroup" ADD CONSTRAINT "TestQuestionGroup_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TestSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_partId_fkey" FOREIGN KEY ("partId") REFERENCES "TestPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TestSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestQuestion" ADD CONSTRAINT "TestQuestion_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TestQuestionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherResource" ADD CONSTRAINT "TeacherResource_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherResource" ADD CONSTRAINT "TeacherResource_liveClassId_fkey" FOREIGN KEY ("liveClassId") REFERENCES "LiveClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentApprovalRequest" ADD CONSTRAINT "StudentApprovalRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherApprovalRequest" ADD CONSTRAINT "TeacherApprovalRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataExportRequest" ADD CONSTRAINT "DataExportRequest_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGoal" ADD CONSTRAINT "StudentGoal_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGoal" ADD CONSTRAINT "StudentGoal_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BundleCourseTeachers" ADD CONSTRAINT "_BundleCourseTeachers_A_fkey" FOREIGN KEY ("A") REFERENCES "BundleCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BundleCourseTeachers" ADD CONSTRAINT "_BundleCourseTeachers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
