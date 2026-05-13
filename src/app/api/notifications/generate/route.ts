import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiServerError, apiForbidden } from '@/lib/api-response';

/**
 * POST /api/notifications/generate
 * Generates smart notifications for enrolled students:
 * 1. Missed class alerts — for classes that ended and the student had no attendance
 * 2. Assignment deadline reminders — 6 hours before deadline
 * 3. Exam start reminders — 2 hours before exam availableFrom
 *
 * Designed to be called periodically (e.g. every 30 minutes via cron or manual trigger).
 * Each notification is deduplicated by checking if an identical notification already exists.
 * Only ADMIN and SUPER_ADMIN can trigger this endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const now = new Date();
    let totalCreated = 0;

    // ─────────────────────────────────────────────
    // 1. MISSED CLASS NOTIFICATIONS
    // ─────────────────────────────────────────────
    // Find classes that ended in the last 24 hours
    const missedWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentlyEndedClasses = await prisma.liveClass.findMany({
      where: {
        startTime: {
          gte: missedWindowStart,
          lt: now,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            enrollments: {
              where: { status: 'ACTIVE' },
              select: { userId: true },
            },
          },
        },
        attendances: {
          where: { isCounted: true },
          select: { userId: true },
        },
      },
    });

    for (const liveClass of recentlyEndedClasses) {
      const endTime = new Date(
        new Date(liveClass.startTime).getTime() + liveClass.duration * 60 * 1000
      );
      // Only process if the class has actually ended
      if (endTime > now) continue;

      const attendedUserIds = new Set(liveClass.attendances.map((a) => a.userId));
      const enrolledUserIds = liveClass.course.enrollments.map((e) => e.userId);
      const missedUserIds = enrolledUserIds.filter((uid) => !attendedUserIds.has(uid));

      if (missedUserIds.length === 0) continue;

      // Check which students already have this notification
      const actionUrl = `/dashboard/live-classes/${liveClass.id}`;
      const existingNotifications = await prisma.notification.findMany({
        where: {
          userId: { in: missedUserIds },
          actionUrl,
          title: { startsWith: 'Missed Class:' },
        },
        select: { userId: true },
      });

      const alreadyNotified = new Set(existingNotifications.map((n) => n.userId));
      const newMissedUserIds = missedUserIds.filter((uid) => !alreadyNotified.has(uid));

      if (newMissedUserIds.length > 0) {
        await prisma.notification.createMany({
          data: newMissedUserIds.map((userId) => ({
            userId,
            title: `Missed Class: ${liveClass.title}`,
            body: `You missed the live class "${liveClass.title}" in ${liveClass.course.title}. ${
              liveClass.recordingUrl
                ? 'A recording is available — check it out!'
                : 'Check with your teacher for updates.'
            }`,
            type: 'WARNING',
            actionUrl,
          })),
        });
        totalCreated += newMissedUserIds.length;
      }
    }

    // ─────────────────────────────────────────────
    // 2. ASSIGNMENT DEADLINE REMINDERS (6 hours before)
    // ─────────────────────────────────────────────
    const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const upcomingDeadlineAssignments = await prisma.assignment.findMany({
      where: {
        status: 'ACTIVE',
        deadline: {
          gt: now,
          lte: sixHoursFromNow,
        },
        courseId: { not: null },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            enrollments: {
              where: { status: 'ACTIVE' },
              select: { userId: true },
            },
          },
        },
        submissions: {
          select: { studentId: true },
        },
      },
    });

    for (const assignment of upcomingDeadlineAssignments) {
      if (!assignment.course) continue;

      const submittedUserIds = new Set(assignment.submissions.map((s) => s.studentId));
      const enrolledUserIds = assignment.course.enrollments.map((e) => e.userId);
      // Only notify students who haven't submitted yet
      const unsubmittedUserIds = enrolledUserIds.filter((uid) => !submittedUserIds.has(uid));

      if (unsubmittedUserIds.length === 0) continue;

      const actionUrl = `/dashboard/assignments`;
      const notifTitle = `Assignment Due Soon: ${assignment.title}`;

      const existing = await prisma.notification.findMany({
        where: {
          userId: { in: unsubmittedUserIds },
          title: notifTitle,
        },
        select: { userId: true },
      });

      const alreadyNotified = new Set(existing.map((n) => n.userId));
      const newUserIds = unsubmittedUserIds.filter((uid) => !alreadyNotified.has(uid));

      if (newUserIds.length > 0) {
        const hoursLeft = Math.ceil(
          (new Date(assignment.deadline!).getTime() - now.getTime()) / (60 * 60 * 1000)
        );

        await prisma.notification.createMany({
          data: newUserIds.map((userId) => ({
            userId,
            title: notifTitle,
            body: `Your assignment "${assignment.title}" in ${assignment.course!.title} is due in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}. Submit now to avoid missing the deadline!`,
            type: 'WARNING',
            actionUrl,
          })),
        });
        totalCreated += newUserIds.length;
      }
    }

    // ─────────────────────────────────────────────
    // 3. EXAM START REMINDERS (2 hours before)
    // ─────────────────────────────────────────────
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const upcomingExams = await prisma.courseTest.findMany({
      where: {
        status: 'PUBLISHED',
        availableFrom: {
          gt: now,
          lte: twoHoursFromNow,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            enrollments: {
              where: { status: 'ACTIVE' },
              select: { userId: true },
            },
          },
        },
      },
    });

    for (const exam of upcomingExams) {
      const enrolledUserIds = exam.course.enrollments.map((e) => e.userId);
      if (enrolledUserIds.length === 0) continue;

      const actionUrl = `/dashboard/courses/${exam.course.slug}/tests`;
      const notifTitle = `Exam Starting Soon: ${exam.title}`;

      const existing = await prisma.notification.findMany({
        where: {
          userId: { in: enrolledUserIds },
          title: notifTitle,
        },
        select: { userId: true },
      });

      const alreadyNotified = new Set(existing.map((n) => n.userId));
      const newUserIds = enrolledUserIds.filter((uid) => !alreadyNotified.has(uid));

      if (newUserIds.length > 0) {
        const minsLeft = Math.ceil(
          (new Date(exam.availableFrom!).getTime() - now.getTime()) / (60 * 1000)
        );

        await prisma.notification.createMany({
          data: newUserIds.map((userId) => ({
            userId,
            title: notifTitle,
            body: `Your exam "${exam.title}" in ${exam.course.title} starts in ${minsLeft} minutes. Make sure you're prepared!`,
            type: 'INFO',
            actionUrl,
          })),
        });
        totalCreated += newUserIds.length;
      }
    }

    return apiSuccess(
      {
        generated: totalCreated,
        timestamp: now.toISOString(),
      },
      `Generated ${totalCreated} notification${totalCreated !== 1 ? 's' : ''}`
    );
  } catch (err) {
    console.error('[GENERATE_NOTIFICATIONS_ERROR]', err);
    return apiServerError();
  }
}
