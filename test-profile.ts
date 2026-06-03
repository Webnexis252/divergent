import prisma from "./src/lib/prisma";

async function main() {
  const userId = "cmodz0sb20000ycu80qipo0zo";
  console.log("Testing queries for user:", userId);

  try {
    const userDb = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, xpPoints: true, totalStudyTime: true },
    });
    console.log("userDb:", !!userDb);

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

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
      prisma.notification.findMany({ where: { userId, isRead: false }, take: 1 }),
      prisma.attendance.findMany({ where: { userId, isCounted: true }, take: 1 }),
      prisma.lessonProgress.findMany({ where: { userId, updatedAt: { gte: startOfWeek } }, take: 1 }),
      prisma.assignmentSubmission.count({ where: { studentId: userId, submittedAt: { gte: startOfWeek } } }),
      prisma.attendance.count({ where: { userId, joinedAt: { gte: startOfWeek }, isCounted: true } }),
      prisma.enrollment.findMany({ where: { userId, status: "ACTIVE" }, take: 1 }),
      prisma.quizAttempt.findMany({ where: { userId }, take: 1 }),
      prisma.testAttempt.findMany({
        where: { userId, submittedAt: { not: null }, gradingStatus: { in: ["AUTO_GRADED", "FULLY_GRADED"] } },
        take: 1,
        select: {
          gradingStatus: true,
          answers: true,
          sketchGrades: true,
          test: {
            select: {
              questions: {
                select: { id: true, type: true, category: true, points: true, correctAnswer: true, explanation: true }
              }
            }
          }
        }
      }),
      prisma.studentGoal.findMany({ where: { studentId: userId, weekStart: { gte: startOfWeek } }, take: 1 }),
    ]);

    console.log("All queries ran successfully");
  } catch (err) {
    console.error("ERROR:", err);
  }
}

main().finally(() => process.exit(0));
