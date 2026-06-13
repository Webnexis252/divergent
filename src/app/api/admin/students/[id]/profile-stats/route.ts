import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiUnauthorized, apiServerError, apiNotFound, apiForbidden } from "@/lib/api-response";
import { averageCategoryPerformanceBreakdown } from "@/lib/test-category-performance";
import { gradeQuestionAnswer } from "@/lib/test-grading";
import { formatWatchTimeStat } from "@/lib/live-class-attendance";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiForbidden("Admin access required");

    const { id: studentId } = await params;

    const userDb = await prisma.user.findUnique({
      where: { id: studentId, role: "STUDENT" },
      select: { id: true, xpPoints: true, totalStudyTime: true, name: true, email: true, image: true },
    });

    if (!userDb) {
      return apiNotFound("Student");
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Fetch all student metrics concurrently in a single round-trip batch.
    const [
      notifications,
      attendanceRecords,
      weeklyProgress,
      weeklyAssignments,
      weeklyAttendance,
      enrollments,
      quizAttempts,
      latestTestAttempts,
      studentGoals,
    ] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: studentId, isRead: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, body: true, createdAt: true, isRead: true },
      }),
      prisma.attendance.findMany({
        where: { userId: studentId, isCounted: true },
        select: { id: true },
      }),
      prisma.lessonProgress.findMany({
        where: { userId: studentId, updatedAt: { gte: startOfWeek } },
        select: { watchTime: true },
      }),
      prisma.assignmentSubmission.count({
        where: { studentId: studentId, submittedAt: { gte: startOfWeek } },
      }),
      prisma.attendance.count({
        where: { userId: studentId, joinedAt: { gte: startOfWeek }, isCounted: true },
      }),
      prisma.enrollment.findMany({
        where: { userId: studentId, status: "ACTIVE" },
        select: { courseId: true },
      }),
      // Fetch quiz attempts to derive real skill metrics
      prisma.quizAttempt.findMany({
        where: { userId: studentId },
        select: { score: true, isPassed: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.testAttempt.findMany({
        where: {
          userId: studentId,
          submittedAt: { not: null },
          gradingStatus: { in: ["AUTO_GRADED", "FULLY_GRADED"] },
        },
        orderBy: { submittedAt: "desc" },
        take: 3,
        select: {
          gradingStatus: true,
          answers: true,
          sketchGrades: true,
          test: {
            select: {
              questions: {
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  type: true,
                  category: true,
                  points: true,
                  correctAnswer: true,
                  explanation: true,
                },
              },
            },
          },
        },
      }),
      prisma.studentGoal.findMany({
        where: { studentId: studentId, weekStart: { gte: startOfWeek } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const courseIds = enrollments.map((e) => e.courseId);

    // Run the liveClass count concurrently rather than sequentially
    const totalPastClasses =
      courseIds.length > 0
        ? await prisma.liveClass.count({
            where: { courseId: { in: courseIds }, startTime: { lt: now } },
          })
        : 0;

    const totalWatchTimeSecs = userDb.totalStudyTime;
    const totalWatchTimeHours = totalWatchTimeSecs / 3600;
    const coursesEnrolled = enrollments.length;
    const attendedClasses = attendanceRecords.length;
    const attendanceTotal = Math.max(totalPastClasses, attendedClasses, 1);
    const attendancePercent = Math.round(
      (attendedClasses / attendanceTotal) * 100,
    );

    const weeklyStudyHours = Math.round(
      weeklyProgress.reduce((acc, curr) => acc + curr.watchTime, 0) / 3600,
    );

    // Derive an average quiz score from actual attempts (0 if no attempts)
    const avgQuizScore =
      quizAttempts.length > 0
        ? Math.round(
            quizAttempts.reduce((sum, a) => sum + a.score, 0) /
              quizAttempts.length,
          )
        : 0;

    const defaultGoals = [
      {
        title: "Complete 15 hours of study",
        percent: Math.min(100, Math.round((weeklyStudyHours / 15) * 100)),
        completed: weeklyStudyHours >= 15,
      },
      {
        title: "Finish 3 Assignments",
        percent: Math.min(100, Math.round((weeklyAssignments / 3) * 100)),
        completed: weeklyAssignments >= 3,
      },
      {
        title: "Attend all lectures (Goal: 5)",
        percent: Math.min(100, Math.round((weeklyAttendance / 5) * 100)),
        completed: weeklyAttendance >= 5,
      },
    ];

    const weeklyGoals = studentGoals.length > 0 
      ? studentGoals.map(g => ({
          id: g.id,
          title: g.title,
          percent: g.isCompleted ? 100 : Math.min(100, Math.round((g.current / Math.max(g.target, 1)) * 100)),
          completed: g.isCompleted || g.current >= g.target,
        }))
      : defaultGoals;

    // Topic mastery derived from real quiz performance where possible
    const topicMastery = [
      {
        label: "Quiz Avg",
        value: avgQuizScore,
        color: "#ffecb3",
      },
      {
        label: "Attendance",
        value: attendancePercent,
        color: "#b3e5fc",
      },
      {
        label: "Watch Time",
        value: Math.min(100, Math.round((totalWatchTimeHours / 50) * 100)),
        color: "#ffccbc",
      },
      {
        label: "Assignments",
        value: Math.min(100, Math.round((weeklyAssignments / 3) * 100)),
        color: "#c5cae9",
      },
    ];

    const skillEntriesByAttempt = latestTestAttempts.map((attempt) => {
      const answers = (attempt.answers as Record<string, unknown> | null) || {};
      const sketchGrades =
        (attempt.sketchGrades as Record<string, { points: number; feedback?: string }> | null) ?? {};

      return attempt.test.questions.map((question) => {
        if (question.type === "SKETCH") {
          const pointsAwarded =
            attempt.gradingStatus === "FULLY_GRADED"
              ? sketchGrades[question.id]?.points ?? 0
              : 0;
          return {
            category: question.category,
            points: question.points,
            pointsAwarded,
            isCorrect: attempt.gradingStatus === "FULLY_GRADED" ? pointsAwarded > 0 : null,
          };
        }

        const gradedResult = gradeQuestionAnswer(
          {
            type: question.type,
            points: question.points,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
          },
          answers[question.id],
          { includeAnswerKey: false }
        );

        return {
          category: question.category,
          points: question.points,
          pointsAwarded: gradedResult.pointsAwarded,
          isCorrect: gradedResult.isCorrect,
        };
      });
    });

    const skills =
      latestTestAttempts.length > 0
        ? averageCategoryPerformanceBreakdown(skillEntriesByAttempt, { includeEmpty: true })
        : [];

    return NextResponse.json({
      success: true,
      data: {
        role: "STUDENT",
        user: {
          name: userDb.name,
          email: userDb.email,
          image: userDb.image,
        },
        stats: {
          totalWatchTime: totalWatchTimeHours,
          totalWatchTimeDisplay: formatWatchTimeStat(totalWatchTimeSecs),
          totalWatchTimeSecs,
          totalXp: userDb.xpPoints,
          coursesEnrolled,
          attendance: {
            attended: attendedClasses,
            total: attendanceTotal,
            percent: attendancePercent,
          },
          notifications,
          weeklyGoals,
          topicMastery,
          skills,
          skillTestsEvaluated: latestTestAttempts.length,
        },
      },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    console.error(JSON.stringify({
      level: 'error',
      event: 'GET_ADMIN_PROFILE_STATS_ERROR',
      message: errMsg,
      stack: errStack,
      ts: new Date().toISOString(),
    }));
    return apiServerError();
  }
}
