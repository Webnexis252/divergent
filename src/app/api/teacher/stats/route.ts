import { NextRequest } from 'next/server';
export const dynamic = "force-dynamic";
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getTodayTeacherClasses } from '@/lib/live-class-service';
import {
  apiSuccess,
  apiForbidden,
  apiServerError,
} from '@/lib/api-response';

/**
 * GET /api/teacher/stats
 * Returns aggregate stats for the teacher dashboard.
 * All data is scoped to courses the authenticated teacher is assigned to.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Only mentors can access teacher stats');

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // ── Step 1: Find all courses this teacher is assigned to ────────────────
    const teacherCourses = await prisma.course.findMany({
      where: {
        teachers: { some: { id: auth.userId } },
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        price: true,
        isPublished: true,
        _count: { select: { enrollments: true } },
      },
    });

    const teacherCourseIds = teacherCourses.map((c) => c.id);

    // If teacher has no assigned courses, return zeroed stats
    if (teacherCourseIds.length === 0) {
      const todaysClasses = await getTodayTeacherClasses({
        userId: auth.userId,
        role: auth.role,
      });

      return apiSuccess({
        stats: {
          activeStudents: 0,
          doubtsResolvedToday: 0,
          openDoubtsCount: 0,
          totalEnrollmentsThisWeek: 0,
          avgResponseTime: '—',
          studentSatisfaction: 0,
        },
        courses: [],
        enrolledStudents: [],
        todaysClasses,
        doubtQueue: [],
        recentActivity: [],
        analyticsSnapshot: {
          progressBars: [
            "JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"
          ].map((month) => ({ month, value: 10 })),
          lowEngagementCount: 0,
          missedAssignments: 0,
          assignmentsOverview: { total: 0, pending: 0, late: 0 },
        },
      });
    }

    // ── Step 2: Run all scoped counts in parallel ────────────────────────────
    const [
      activeStudents,
      doubtsResolvedToday,
      openDoubtsCount,
      totalEnrollmentsThisWeek,
      openDoubtTickets,
      recentReplies,
      lowEngagement,
      enrollmentsThisYear,
      totalAssignments,
      pendingGrading,
      lateAssignments,
      enrolledStudents,
    ] = await Promise.all([
      // Unique active students enrolled in teacher's courses
      prisma.enrollment.groupBy({
        by: ['userId'],
        where: {
          courseId: { in: teacherCourseIds },
          status: 'ACTIVE',
        },
      }).then((groups) => groups.length),

      // Doubts resolved today by this teacher
      prisma.doubtTicket.count({
        where: {
          mentorId: auth.userId,
          status: { in: ['RESOLVED', 'CLOSED'] },
          updatedAt: { gte: startOfToday, lte: endOfToday },
        },
      }),

      // Open doubts in teacher's courses (DoubtTicket has no courseId, filter by mentor)
      prisma.doubtTicket.count({
        where: {
          status: 'OPEN',
          mentorId: auth.userId,
        },
      }),

      // New enrollments this week in teacher's courses
      prisma.enrollment.count({
        where: {
          courseId: { in: teacherCourseIds },
          createdAt: { gte: oneWeekAgo },
        },
      }),

      // Open doubt queue assigned to this teacher
      prisma.doubtTicket.findMany({
        where: {
          status: { in: ['OPEN', 'ASSIGNED'] },
          mentorId: auth.userId,
        },
        include: {
          student: { select: { name: true, image: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: 10,
      }),

      // Recent activity (doubt replies by this teacher)
      prisma.doubtReply.findMany({
        where: { authorId: auth.userId },
        include: { doubtTicket: { select: { subject: true } } },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),

      // Low engagement: students in teacher's courses with no progress in last 7 days
      prisma.user.count({
        where: {
          role: 'STUDENT',
          enrollments: {
            some: {
              courseId: { in: teacherCourseIds },
              status: 'ACTIVE',
            },
          },
          lessonProgress: {
            none: { updatedAt: { gte: oneWeekAgo } },
          },
        },
      }),

      // Enrollments this year in teacher's courses (for chart)
      prisma.enrollment.findMany({
        where: {
          courseId: { in: teacherCourseIds },
          createdAt: { gte: startOfYear },
        },
        select: { createdAt: true },
      }),

      // Total assignments for teacher's courses
      prisma.assignment.count({
        where: { courseId: { in: teacherCourseIds } },
      }),

      // Pending grading (submissions without a score, for teacher's courses)
      prisma.assignmentSubmission.count({
        where: {
          assignment: { courseId: { in: teacherCourseIds } },
          score: null,
        },
      }),

      // Late assignments (past deadline, no submissions, teacher's courses)
      prisma.assignment.count({
        where: {
          courseId: { in: teacherCourseIds },
          deadline: { lt: now },
          submissions: { none: {} },
        },
      }),

      // Enrolled students with course info — scoped to teacher's courses
      prisma.enrollment.findMany({
        where: {
          courseId: { in: teacherCourseIds },
          status: 'ACTIVE',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              phone: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const todaysClasses = await getTodayTeacherClasses({
      userId: auth.userId,
      role: auth.role,
    });

    // ── Step 3: Format output ────────────────────────────────────────────────

    const doubtQueue = openDoubtTickets.map((dt) => ({
      id: dt.id,
      subject: dt.subject,
      priority: dt.priority,
      status: dt.status,
      studentName: dt.student.name,
      studentImage: dt.student.image,
      createdAt: dt.createdAt.toISOString(),
    }));

    const recentActivity = recentReplies.map((r) => ({
      title: 'Replied to a doubt',
      detail: r.doubtTicket.subject,
      createdAt: r.createdAt.toISOString(),
    }));

    const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const monthCounts = new Array(12).fill(0);
    enrollmentsThisYear.forEach((e) => monthCounts[e.createdAt.getMonth()]++);
    const maxCount = Math.max(...monthCounts, 1);
    const progressBars = monthNames.map((month, idx) => ({
      month,
      value: Math.max(10, Math.round((monthCounts[idx] / maxCount) * 100)),
    }));

    // Deduplicate students (one student may be enrolled in multiple courses)
    const studentMap = new Map<string, {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      phone: string | null;
      enrolledCourses: { id: string; title: string; thumbnail: string | null; enrolledAt: string }[];
    }>();

    for (const enrollment of enrolledStudents) {
      const uid = enrollment.user.id;
      if (!studentMap.has(uid)) {
        studentMap.set(uid, {
          id: uid,
          name: enrollment.user.name,
          email: enrollment.user.email,
          image: enrollment.user.image,
          phone: enrollment.user.phone ?? null,
          enrolledCourses: [],
        });
      }
      studentMap.get(uid)!.enrolledCourses.push({
        id: enrollment.course.id,
        title: enrollment.course.title,
        thumbnail: enrollment.course.thumbnail,
        enrolledAt: enrollment.createdAt.toISOString(),
      });
    }

    const enrolledStudentsList = Array.from(studentMap.values());

    return apiSuccess({
      stats: {
        activeStudents,
        doubtsResolvedToday,
        openDoubtsCount,
        totalEnrollmentsThisWeek,
        avgResponseTime: '—',
        studentSatisfaction: 0,
      },
      // Teacher's assigned courses summary
      courses: teacherCourses.map((c) => ({
        id: c.id,
        title: c.title,
        thumbnail: c.thumbnail,
        price: c.price,
        isPublished: c.isPublished,
        enrollmentCount: c._count.enrollments,
      })),
      // Students enrolled in teacher's courses (with course details)
      enrolledStudents: enrolledStudentsList,
      todaysClasses,
      doubtQueue,
      recentActivity,
      analyticsSnapshot: {
        progressBars,
        lowEngagementCount: lowEngagement,
        missedAssignments: lateAssignments,
        assignmentsOverview: {
          total: totalAssignments,
          pending: pendingGrading,
          late: lateAssignments,
        },
      },
    });
  } catch (err) {
    console.error('[GET_TEACHER_STATS_ERROR]', err);
    return apiServerError();
  }
}
