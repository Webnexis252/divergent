import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/api-response';

/**
 * GET /api/users/me/progress
 * Returns full progress data for the student:
 * - Course progress with lesson counts
 * - Upcoming and missed live classes
 * - Performance chart (7-day lesson completions)
 * - Weekly goals (derived from actual activity)
 * - Streak and study time
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // --- Course Progress (with real completed lesson counts) ---
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: auth.userId, status: 'ACTIVE' },
      select: {
        progressPercent: true,
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            chapters: {
              where: { isPublished: true },
              select: {
                lessons: {
                  where: { isPublished: true },
                  select: { id: true, durationMins: true },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Gather all lesson IDs across all enrolled courses to batch-fetch completions
    const allLessonIds = enrollments.flatMap((e) =>
      e.course.chapters.flatMap((ch) => ch.lessons.map((l) => l.id)),
    );

    const completedProgressRows = await prisma.lessonProgress.findMany({
      where: {
        userId: auth.userId,
        isCompleted: true,
        lessonId: { in: allLessonIds },
      },
      select: { lessonId: true },
    });
    const completedSet = new Set(completedProgressRows.map((r) => r.lessonId));

    const courseProgress = enrollments.map((e) => {
      const lessons = e.course.chapters.flatMap((ch) => ch.lessons);
      const totalLessons = lessons.length;
      const completedLessons = lessons.filter((l) => completedSet.has(l.id)).length;
      const totalDuration = lessons.reduce((s, l) => s + l.durationMins, 0);
      const percent =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : Math.round(e.progressPercent);
      return {
        id: e.course.id,
        title: e.course.title,
        slug: e.course.slug,
        thumbnail: e.course.thumbnail,
        percent,
        completedLessons,
        totalLessons,
        lessons: `${completedLessons} / ${totalLessons} lessons completed`,
        totalHours: Math.round(totalDuration / 60),
      };
    });


    // --- Lesson completions per day (7-day chart) ---
    const recentProgress = await prisma.lessonProgress.findMany({
      where: {
        userId: auth.userId,
        isCompleted: true,
        updatedAt: { gte: sevenDaysAgo },
      },
      select: { updatedAt: true },
    });

    const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const completionsByDay = Array(7).fill(0);
    recentProgress.forEach((p) => {
      completionsByDay[p.updatedAt.getDay()] += 1;
    });
    const chartData = dayLabels.map((day, i) => ({
      day,
      value: completionsByDay[i],
    }));

    // --- Live Classes ---
    const courseIds = enrollments.map((e) => e.course.id);
    const allClasses = await prisma.liveClass.findMany({
      where: courseIds.length > 0 ? { courseId: { in: courseIds } } : { id: '' }, // no results if no courses
      include: { course: { select: { title: true, slug: true } }, attendance: { select: { id: true } } },
      orderBy: { startTime: 'asc' },
    });

    const upcomingClasses = allClasses
      .filter((lc) => lc.startTime > now)
      .slice(0, 5)
      .map((lc) => ({
        id: lc.id,
        title: lc.title,
        mentor: lc.course.title,
        time: lc.startTime.toISOString(),
        duration: lc.duration,
        meetingUrl: lc.meetingUrl,
      }));

    // "Missed" = completed classes the student did NOT attend
    const attendedIds = await prisma.attendance.findMany({
      where: { userId: auth.userId },
      select: { liveClassId: true },
    });
    const attendedSet = new Set(attendedIds.map((a) => a.liveClassId));

    const missedClasses = allClasses
      .filter((lc) => {
        const endTime = new Date(lc.startTime.getTime() + lc.duration * 60000);
        return endTime < now && !attendedSet.has(lc.id);
      })
      .slice(0, 5)
      .map((lc) => ({
        id: lc.id,
        title: lc.title,
        mentor: lc.course.title,
        courseTitle: lc.course.title,
        courseSlug: lc.course.slug,
        time: lc.startTime.toISOString(),
        duration: lc.duration,
        attendeeCount: lc.attendance.length,
        recordingUrl: lc.recordingUrl,
      }));

    // --- User stats ---
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { streakCount: true, totalStudyTime: true, xpPoints: true },
    });

    // --- Weekly Goals (derived from real activity) ---
    const completedThisWeek = recentProgress.length;
    const assignmentsSubmitted = await prisma.assignmentSubmission.count({
      where: {
        studentId: auth.userId,
        submittedAt: { gte: sevenDaysAgo },
      },
    });
    const classesAttendedThisWeek = await prisma.attendance.count({
      where: {
        userId: auth.userId,
        joinedAt: { gte: sevenDaysAgo },
      },
    });
    const studyHoursThisWeek = Math.round(
      (user?.totalStudyTime ?? 0) / 3600
    );
    // Goals: target against reasonable goals
    const weeklyGoals = [
      {
        title: 'Complete 15 hours of study',
        percent: Math.min(100, Math.round((studyHoursThisWeek / 15) * 100)),
        color: '#62c6ff',
      },
      {
        title: 'Finish 8 assignments',
        percent: Math.min(100, Math.round((assignmentsSubmitted / 8) * 100)),
        color: '#9747ff',
      },
      {
        title: 'Attend all lectures',
        percent:
          allClasses.filter((lc) => {
            const end = new Date(lc.startTime.getTime() + lc.duration * 60000);
            return end < now;
          }).length > 0
            ? Math.min(
                100,
                Math.round(
                  (classesAttendedThisWeek /
                    allClasses.filter((lc) => {
                      const end = new Date(
                        lc.startTime.getTime() + lc.duration * 60000
                      );
                      return end < now;
                    }).length) *
                    100
                )
              )
            : 0,
        color: '#ff6b62',
      },
      {
        title: 'Review course materials',
        percent: Math.min(100, Math.round((completedThisWeek / 10) * 100)),
        color: '#6271ff',
      },
    ];

    // --- Topic Mastery (derived from real LessonProgress per chapter) ---
    const topicMastery = enrollments.flatMap((e) =>
      e.course.chapters.map((ch) => {
        const lessonCount = ch.lessons.length;
        if (lessonCount === 0) return null;
        const completedInChapter = ch.lessons.filter((l) => completedSet.has(l.id)).length;
        const percent = Math.round((completedInChapter / lessonCount) * 100);
        let tone: 'strong' | 'moderate' | 'weak';
        if (percent >= 70) tone = 'strong';
        else if (percent >= 40) tone = 'moderate';
        else tone = 'weak';
        return { label: e.course.title, tone };
      }),
    ).filter(Boolean).slice(0, 6);

    return apiSuccess({
      courseProgress,
      chartData,
      upcomingClasses,
      missedClasses,
      weeklyGoals,
      weeklyStudyHours: studyHoursThisWeek,
      streakCount: user?.streakCount ?? 0,
      topicMastery,
    });
  } catch (err) {
    console.error('[GET_MY_PROGRESS_ERROR]', err);
    return apiServerError();
  }
}
