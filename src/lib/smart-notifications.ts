import prisma from '@/lib/prisma';

/**
 * Lightweight notification generator that runs server-side.
 * Called from the GET /api/notifications endpoint to auto-generate
 * smart notifications for a specific user.
 *
 * Creates notifications for:
 * 1. Missed classes (that ended in the last 24 hours)
 * 2. Assignment deadlines (due within 6 hours)
 * 3. Upcoming exams (starting within 2 hours)
 *
 * Each notification is deduplicated by title + actionUrl + userId
 * to prevent duplicate notifications on repeated calls.
 */
const lastGenerationTime = new Map<string, number>();
const GENERATION_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export async function generateSmartNotificationsForUser(userId: string) {
  const now = new Date();
  
  // Debounce: Only run once per hour per user to avoid exhausting the DB connection pool
  const lastTime = lastGenerationTime.get(userId) || 0;
  if (now.getTime() - lastTime < GENERATION_COOLDOWN_MS) {
    return;
  }
  
  // Optimistically set the last generation time to prevent concurrent executions
  lastGenerationTime.set(userId, now.getTime());

  try {
    // Get user's enrolled course IDs
    const enrollments = await prisma.enrollment.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { courseId: true },
    });

    const courseIds = enrollments.map((e) => e.courseId);
    if (courseIds.length === 0) return;

    const notificationsToCreate: Array<{
      userId: string;
      title: string;
      body: string;
      type: string;
      actionUrl: string;
    }> = [];

    // ─── 1. MISSED CLASSES ───────────────────────
    const missedWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentClasses = await prisma.liveClass.findMany({
      where: {
        courseId: { in: courseIds },
        startTime: {
          gte: missedWindowStart,
          lt: now,
        },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        duration: true,
        recordingUrl: true,
        course: { select: { title: true } },
        attendances: {
          where: { userId, isCounted: true },
          select: { id: true },
        },
      },
    });

    for (const lc of recentClasses) {
      const endTime = new Date(
        new Date(lc.startTime).getTime() + lc.duration * 60 * 1000
      );
      if (endTime > now) continue; // Not yet ended
      if (lc.attendances.length > 0) continue; // Student attended

      notificationsToCreate.push({
        userId,
        title: `Missed Class: ${lc.title}`,
        body: `You missed "${lc.title}" in ${lc.course.title}. ${
          lc.recordingUrl
            ? 'A recording is available — watch it now!'
            : 'Check with your teacher for updates.'
        }`,
        type: 'WARNING',
        actionUrl: lc.recordingUrl
          ? `/dashboard/live-classes/${lc.id}/recording`
          : `/dashboard/live-classes/${lc.id}`,
      });
    }

    // ─── 2. ASSIGNMENT DEADLINES (≤6 hours away) ──
    const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const urgentAssignments = await prisma.assignment.findMany({
      where: {
        status: 'ACTIVE',
        courseId: { in: courseIds },
        deadline: { gt: now, lte: sixHoursFromNow },
      },
      select: {
        id: true,
        title: true,
        deadline: true,
        course: { select: { title: true } },
        submissions: {
          where: { studentId: userId },
          select: { id: true },
        },
      },
    });

    for (const a of urgentAssignments) {
      if (a.submissions.length > 0) continue; // Already submitted

      const hoursLeft = Math.ceil(
        (new Date(a.deadline!).getTime() - now.getTime()) / (60 * 60 * 1000)
      );

      notificationsToCreate.push({
        userId,
        title: `Assignment Due Soon: ${a.title}`,
        body: `"${a.title}" in ${a.course?.title ?? 'your course'} is due in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}. Submit before the deadline!`,
        type: 'WARNING',
        actionUrl: '/dashboard/assignments',
      });
    }

    // ─── 3. UPCOMING EXAMS (≤2 hours away) ────────
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const upcomingExams = await prisma.courseTest.findMany({
      where: {
        status: 'PUBLISHED',
        courseId: { in: courseIds },
        availableFrom: { gt: now, lte: twoHoursFromNow },
      },
      select: {
        id: true,
        title: true,
        availableFrom: true,
        course: { select: { title: true, slug: true } },
      },
    });

    for (const exam of upcomingExams) {
      const minsLeft = Math.ceil(
        (new Date(exam.availableFrom!).getTime() - now.getTime()) / (60 * 1000)
      );

      notificationsToCreate.push({
        userId,
        title: `Exam Starting Soon: ${exam.title}`,
        body: `"${exam.title}" in ${exam.course.title} starts in ${minsLeft} minutes. Get ready!`,
        type: 'INFO',
        actionUrl: `/dashboard/courses/${exam.course.slug}/tests`,
      });
    }

    if (notificationsToCreate.length === 0) return;

    // Deduplicate: check which notifications already exist
    const existingTitles = await prisma.notification.findMany({
      where: {
        userId,
        title: { in: notificationsToCreate.map((n) => n.title) },
      },
      select: { title: true, actionUrl: true },
    });

    const existingKey = new Set(
      existingTitles.map((n) => `${n.title}::${n.actionUrl}`)
    );

    const newNotifications = notificationsToCreate.filter(
      (n) => !existingKey.has(`${n.title}::${n.actionUrl}`)
    );

    if (newNotifications.length > 0) {
      await prisma.notification.createMany({
        data: newNotifications,
      });
    }
  } catch (err) {
    // Silently fail — smart notifications are non-critical
    console.error('[SMART_NOTIFICATION_GENERATION_ERROR]', err);
  }
}
