import prisma from '@/lib/prisma';
import { averageCategoryPerformanceBreakdown, type CategoryPerformanceItem } from '@/lib/test-category-performance';
import { gradeQuestionAnswer } from '@/lib/test-grading';
import { studyWeek } from '@/lib/study-time';

/**
 * Data behind the student progress page. Shared by GET /api/users/me/progress
 * (client revalidation) and the progress page, which loads it on the server so
 * the page arrives with content instead of a spinner.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
// Past classes scanned to find the 5 missed ones (some may still be running).
const MISSED_CLASS_SCAN = 25;

export type StudentProgress = Awaited<ReturnType<typeof getStudentProgress>>;

/**
 * Course progress, the 7-day completion chart, upcoming and missed classes,
 * weekly goals and topic mastery.
 *
 * After the one enrollments query (the rest depend on its course ids), every
 * query runs in parallel, and the live-class queries fetch only the rows shown
 * (5 upcoming, 5 missed) plus a COUNT, instead of every class ever held in the
 * student's courses together with all of their attendance records.
 */
export async function getStudentProgress(userId: string) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  // Weekly goals count from Monday 00:00 IST, so they start from zero each week
  const week = studyWeek(now);

  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: 'ACTIVE' },
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

  const courseIds = enrollments.map((e) => e.course.id);
  const allLessonIds = enrollments.flatMap((e) =>
    e.course.chapters.flatMap((ch) => ch.lessons.map((l) => l.id)),
  );
  const hasCourses = courseIds.length > 0;

  const [
    completedProgressRows,
    recentProgress,
    user,
    weeklyStudy,
    assignmentsSubmitted,
    upcomingRows,
    pastUnattendedRows,
    weeklyLectures,
  ] = await Promise.all([
    allLessonIds.length > 0
      ? prisma.lessonProgress.findMany({
          where: { userId, isCompleted: true, lessonId: { in: allLessonIds } },
          select: { lessonId: true },
        })
      : [],
    prisma.lessonProgress.findMany({
      where: { userId, isCompleted: true, updatedAt: { gte: sevenDaysAgo } },
      select: { updatedAt: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { streakCount: true },
    }),
    prisma.weeklyStudyTime.findUnique({
      where: { userId_weekStart: { userId, weekStart: week.weekStart } },
      select: { seconds: true },
    }),
    prisma.assignmentSubmission.count({
      where: { studentId: userId, submittedAt: { gte: week.startsAt } },
    }),
    hasCourses
      ? prisma.liveClass.findMany({
          where: { courseId: { in: courseIds }, startTime: { gt: now } },
          orderBy: { startTime: 'asc' },
          take: 5,
          select: {
            id: true,
            title: true,
            startTime: true,
            duration: true,
            meetingUrl: true,
            course: { select: { title: true } },
          },
        })
      : [],
    hasCourses
      ? prisma.liveClass.findMany({
          where: {
            courseId: { in: courseIds },
            startTime: { lte: now },
            attendances: { none: { userId } },
          },
          orderBy: { startTime: 'asc' },
          take: MISSED_CLASS_SCAN,
          select: {
            id: true,
            title: true,
            startTime: true,
            duration: true,
            recordingUrl: true,
            course: { select: { title: true, slug: true } },
            _count: { select: { attendances: true } },
          },
        })
      : [],
    hasCourses ? countWeeklyLectures(userId, courseIds, week.startsAt, now) : { ended: 0, attended: 0 },
  ]);

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
  // Oldest day first, ending with today. The 7×24h query window reaches into
  // the morning of an 8th day; those completions are left out rather than
  // being counted under today's weekday.
  const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const completionsByDay = Array(7).fill(0);
  recentProgress.forEach((p) => {
    const daysAgo = Math.max(0, Math.ceil((startOfToday.getTime() - p.updatedAt.getTime()) / DAY_MS));
    if (daysAgo <= 6) completionsByDay[6 - daysAgo] += 1;
  });
  const chartData = completionsByDay.map((value, i) => ({
    day: dayLabels[(now.getDay() - (6 - i) + 7) % 7],
    value,
  }));

  // --- Live classes ---
  const upcomingClasses = upcomingRows.map((lc) => ({
    id: lc.id,
    title: lc.title,
    mentor: lc.course.title,
    time: lc.startTime.toISOString(),
    duration: lc.duration,
    meetingUrl: lc.meetingUrl,
  }));

  // "Missed" = classes that have ended without the student attending
  const missedClasses = pastUnattendedRows
    .filter((lc) => lc.startTime.getTime() + lc.duration * 60000 < now.getTime())
    .slice(0, 5)
    .map((lc) => ({
      id: lc.id,
      title: lc.title,
      mentor: lc.course.title,
      courseTitle: lc.course.title,
      courseSlug: lc.course.slug,
      time: lc.startTime.toISOString(),
      duration: lc.duration,
      attendeeCount: lc._count.attendances,
      recordingUrl: lc.recordingUrl,
    }));

  // --- Weekly goals (derived from this week's activity) ---
  const studySecondsThisWeek = weeklyStudy?.seconds ?? 0;
  const lessonsCompletedThisWeek = recentProgress.filter((p) => p.updatedAt >= week.startsAt).length;
  const weeklyGoals = [
    {
      title: 'Complete 15 hours of study',
      percent: Math.min(100, Math.round((studySecondsThisWeek / (15 * 3600)) * 100)),
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
        weeklyLectures.ended > 0 ? Math.round((weeklyLectures.attended / weeklyLectures.ended) * 100) : 0,
      color: '#ff6b62',
    },
    {
      title: 'Review course materials',
      percent: Math.min(100, Math.round((lessonsCompletedThisWeek / 10) * 100)),
      color: '#6271ff',
    },
  ];

  // --- Topic mastery (from lesson completion per chapter) ---
  const topicMastery = enrollments
    .flatMap((e) =>
      e.course.chapters.map((ch) => {
        const lessonCount = ch.lessons.length;
        if (lessonCount === 0) return null;
        const completedInChapter = ch.lessons.filter((l) => completedSet.has(l.id)).length;
        const percent = Math.round((completedInChapter / lessonCount) * 100);
        const tone: 'strong' | 'moderate' | 'weak' = percent >= 70 ? 'strong' : percent >= 40 ? 'moderate' : 'weak';
        return { label: e.course.title, tone };
      }),
    )
    .filter((t): t is { label: string; tone: 'strong' | 'moderate' | 'weak' } => t !== null)
    .slice(0, 6);

  return {
    courseProgress,
    chartData,
    upcomingClasses,
    missedClasses,
    weeklyGoals,
    // One decimal, so the first half hour of the week doesn't read as 0h
    weeklyStudyHours: Math.round(studySecondsThisWeek / 360) / 10,
    streakCount: user?.streakCount ?? 0,
    topicMastery,
  };
}

/** Classes in these courses whose end time (start + duration) has passed. */
/**
 * This week's live classes in the student's courses that have already ended,
 * and how many of them the student attended long enough to count.
 */
async function countWeeklyLectures(
  userId: string,
  courseIds: string[],
  weekStartsAt: Date,
  now: Date,
): Promise<{ ended: number; attended: number }> {
  const [counts] = await prisma.$queryRaw<Array<{ ended: number; attended: number }>>`
    SELECT COUNT(*)::int AS ended, COUNT(a.id)::int AS attended
    FROM "LiveClass" lc
    LEFT JOIN "Attendance" a
      ON a."liveClassId" = lc.id AND a."userId" = ${userId} AND a."isCounted"
    WHERE lc."courseId" = ANY(${courseIds})
      AND lc."startTime" >= ${weekStartsAt}
      AND lc."startTime" + make_interval(mins => lc."duration") < ${now}
  `;
  return counts;
}

/**
 * Per-category performance across the student's last 3 graded tests, used by
 * the progress page's Topic Mastery and by GET /api/users/me/profile-stats.
 */
export async function getStudentSkillBreakdown(
  userId: string,
): Promise<{ skills: CategoryPerformanceItem[]; skillTestsEvaluated: number }> {
  const latestTestAttempts = await prisma.testAttempt.findMany({
    where: {
      userId,
      submittedAt: { not: null },
      gradingStatus: { in: ['AUTO_GRADED', 'FULLY_GRADED'] },
    },
    orderBy: { submittedAt: 'desc' },
    take: 3,
    select: {
      gradingStatus: true,
      answers: true,
      sketchGrades: true,
      test: {
        select: {
          questions: {
            orderBy: { order: 'asc' },
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
  });

  const skillEntriesByAttempt = latestTestAttempts.map((attempt) => {
    const answers = (attempt.answers as Record<string, unknown> | null) || {};
    const sketchGrades =
      (attempt.sketchGrades as Record<string, { points: number; feedback?: string }> | null) ?? {};

    return attempt.test.questions.map((question) => {
      if (question.type === 'SKETCH') {
        const pointsAwarded =
          attempt.gradingStatus === 'FULLY_GRADED' ? sketchGrades[question.id]?.points ?? 0 : 0;
        return {
          category: question.category,
          points: question.points,
          pointsAwarded,
          isCorrect: attempt.gradingStatus === 'FULLY_GRADED' ? pointsAwarded > 0 : null,
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
        { includeAnswerKey: false },
      );

      return {
        category: question.category,
        points: question.points,
        pointsAwarded: gradedResult.pointsAwarded,
        isCorrect: gradedResult.isCorrect,
      };
    });
  });

  return {
    skills:
      latestTestAttempts.length > 0
        ? averageCategoryPerformanceBreakdown(skillEntriesByAttempt, { includeEmpty: true })
        : [],
    skillTestsEvaluated: latestTestAttempts.length,
  };
}
