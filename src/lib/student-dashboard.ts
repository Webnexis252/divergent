import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { UpcomingOverviewResponse } from '@/lib/upcoming-overview';

/**
 * Data behind the student dashboard. Shared by the API routes (used for
 * client-side revalidation) and the dashboard page, which loads it on the
 * server so the first paint already has it.
 */

export type StudentDashboardStats = {
  enrollmentCount: number;
  streakCount: number;
  xpPoints: number;
  enrolledCourses: Array<{
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    description: string | null;
    progressPercent: number;
    meta: string;
    teacherName: string | null;
    enrolledAt: Date;
  }>;
};

/** Streak, XP and the four most recently active enrollments. Null if the user is gone. */
export async function getStudentDashboardStats(
  userId: string,
): Promise<StudentDashboardStats | null> {
  const [user, enrollmentCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        streakCount: true,
        xpPoints: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          orderBy: { updatedAt: 'desc' },
          take: 4,
          select: {
            progressPercent: true,
            createdAt: true,
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnail: true,
                description: true,
                teachers: {
                  select: {
                    name: true,
                  },
                },
                chapters: {
                  select: {
                    _count: { select: { lessons: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.enrollment.count({
      where: { userId, status: 'ACTIVE' },
    }),
  ]);

  if (!user) return null;

  const enrolledCourses = user.enrollments.map((e) => {
    const lessonCount = e.course.chapters.reduce(
      (sum, ch) => sum + ch._count.lessons,
      0,
    );
    return {
      id: e.course.id,
      title: e.course.title,
      slug: e.course.slug,
      thumbnail: e.course.thumbnail,
      description: e.course.description,
      progressPercent: e.progressPercent,
      meta: `${lessonCount} lesson${lessonCount !== 1 ? 's' : ''}`,
      teacherName: e.course.teachers.map((t) => t.name).join(', ') || null,
      enrolledAt: e.createdAt,
    };
  });

  return {
    enrollmentCount,
    streakCount: user.streakCount,
    xpPoints: user.xpPoints,
    enrolledCourses,
  };
}

const EMPTY_OVERVIEW: UpcomingOverviewResponse = {
  nextClass: null,
  nextExam: null,
  nextAssignment: null,
  counts: {
    upcomingClasses: 0,
    openExams: 0,
    pendingAssignments: 0,
  },
};

/**
 * The next class, exam and assignment across the student's active courses,
 * plus how many of each are pending. Each list is a COUNT plus a single-row
 * lookup, so the cost doesn't grow with how many classes or quizzes a course
 * has.
 */
export async function getUpcomingOverview(userId: string): Promise<UpcomingOverviewResponse> {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: 'ACTIVE' },
    select: { courseId: true },
  });
  const courseIds = enrollments.map((enrollment) => enrollment.courseId);
  if (courseIds.length === 0) return EMPTY_OVERVIEW;

  const now = new Date();
  const classWhere: Prisma.LiveClassWhereInput = {
    courseId: { in: courseIds },
    startTime: { gt: now },
  };
  const assignmentWhere: Prisma.AssignmentWhereInput = {
    status: 'ACTIVE',
    courseId: { in: courseIds },
    submissions: { none: { studentId: userId } },
  };
  const quizWhere: Prisma.QuizWhereInput = {
    lesson: {
      isPublished: true,
      chapter: {
        isPublished: true,
        courseId: { in: courseIds },
      },
    },
    attempts: {
      none: { userId },
    },
  };
  const courseSummary = { select: { title: true, slug: true } } as const;

  const [
    upcomingClasses,
    nextClassRow,
    pendingAssignments,
    nextAssignmentRow,
    openExams,
    nextQuizRow,
  ] = await Promise.all([
    prisma.liveClass.count({ where: classWhere }),
    prisma.liveClass.findFirst({
      where: classWhere,
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        title: true,
        startTime: true,
        duration: true,
        meetingUrl: true,
        course: courseSummary,
      },
    }),
    prisma.assignment.count({ where: assignmentWhere }),
    prisma.assignment.findFirst({
      where: assignmentWhere,
      // Soonest deadline first; assignments without one come last, oldest first.
      orderBy: [{ deadline: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        deadline: true,
        points: true,
        course: courseSummary,
      },
    }),
    prisma.quiz.count({ where: quizWhere }),
    prisma.quiz.findFirst({
      where: quizWhere,
      orderBy: [
        { lesson: { chapter: { order: 'asc' } } },
        { lesson: { order: 'asc' } },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        title: true,
        lesson: {
          select: {
            id: true,
            title: true,
            chapter: { select: { course: courseSummary } },
          },
        },
      },
    }),
  ]);

  return {
    nextClass: nextClassRow
      ? {
          id: nextClassRow.id,
          title: nextClassRow.title,
          courseTitle: nextClassRow.course.title,
          courseSlug: nextClassRow.course.slug,
          startTime: nextClassRow.startTime.toISOString(),
          duration: nextClassRow.duration,
          meetingUrl: nextClassRow.meetingUrl,
        }
      : null,
    nextExam: nextQuizRow
      ? {
          quizId: nextQuizRow.id,
          title: nextQuizRow.title,
          lessonId: nextQuizRow.lesson.id,
          lessonTitle: nextQuizRow.lesson.title,
          courseTitle: nextQuizRow.lesson.chapter.course.title,
          courseSlug: nextQuizRow.lesson.chapter.course.slug,
          ctaHref: `/dashboard/courses/${nextQuizRow.lesson.chapter.course.slug}`,
          availabilityLabel: 'Available now',
        }
      : null,
    nextAssignment: nextAssignmentRow
      ? {
          id: nextAssignmentRow.id,
          title: nextAssignmentRow.title,
          courseTitle: nextAssignmentRow.course?.title ?? 'General',
          courseSlug: nextAssignmentRow.course?.slug ?? null,
          deadline: nextAssignmentRow.deadline?.toISOString() ?? null,
          points: nextAssignmentRow.points,
        }
      : null,
    counts: {
      upcomingClasses,
      openExams,
      pendingAssignments,
    },
  };
}
