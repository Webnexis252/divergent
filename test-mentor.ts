import prisma from "./src/lib/prisma";

async function main() {
  const userId = "cmoh632jx0000jj041xnouzss"; // Devansh Goel (SUPER_ADMIN)
  console.log("Testing queries for user:", userId);

  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [notifications, dbGoals, dbSkills, teacherCourses] =
      await Promise.all([
        prisma.notification.findMany({ where: { userId, isRead: false }, take: 1 }),
        prisma.mentorGoal.findMany({ where: { mentorId: userId, month: currentMonth, year: currentYear }, take: 1 }),
        prisma.mentorSkill.findMany({ where: { mentorId: userId }, take: 1 }),
        prisma.course.findMany({ where: { teachers: { some: { id: userId } } }, select: { id: true, title: true }, take: 1 }),
      ]);

    const courseIds = teacherCourses.map((c) => c.id);

    const [pastClasses, enrollments] = await Promise.all([
      prisma.liveClass.findMany({ where: { courseId: { in: courseIds }, startTime: { lt: now } }, take: 1 }),
      prisma.enrollment.findMany({ where: { courseId: { in: courseIds }, status: "ACTIVE" }, take: 1, distinct: ["userId"] }),
    ]);

    console.log("All queries ran successfully");
  } catch (err) {
    console.error("ERROR:", err);
  }
}

main().finally(() => process.exit(0));
