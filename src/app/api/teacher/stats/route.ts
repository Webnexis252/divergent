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
 * Requires teacher-level access.
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

    // Run all counts in parallel for speed
    const [
      activeStudents,
      doubtsResolvedToday,
      openDoubtsCount,
      totalEnrollments,
      openDoubtTickets,
      recentReplies,
      lowEngagement,
      enrollmentsThisYear,
      totalAssignments,
      pendingGrading,
      lateAssignments,
    ] = await Promise.all([
      // Total unique active students
      prisma.enrollment.groupBy({
        by: ['userId'],
        where: { status: 'ACTIVE' },
      }).then((groups) => groups.length),

      // Doubts resolved today (RESOLVED or CLOSED, updated today)
      prisma.doubtTicket.count({
        where: {
          mentorId: auth.role === 'MENTOR' ? auth.userId : undefined,
          status: { in: ['RESOLVED', 'CLOSED'] },
          updatedAt: { gte: startOfToday, lte: endOfToday },
        },
      }),

      // Open doubts total
      prisma.doubtTicket.count({
        where: { status: 'OPEN' },
      }),

      // Total enrollments this week
      prisma.enrollment.count({
        where: {
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),

      // Fetch open doubt tickets for the queue
      prisma.doubtTicket.findMany({
        where: { status: { in: ['OPEN', 'ASSIGNED'] } },
        include: {
          student: { select: { name: true, image: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: 10,
      }),

      // Fetch Recent Activity (Doubt Replies by this teacher)
      prisma.doubtReply.findMany({
        where: { authorId: auth.userId },
        include: { doubtTicket: { select: { subject: true } } },
        orderBy: { createdAt: 'desc' },
        take: 4,
      }),

      // Low Engagement (Students enrolled but no progress in last 7 days)
      prisma.user.count({
        where: {
          role: 'STUDENT',
          enrollments: { some: { status: 'ACTIVE' } },
          lessonProgress: { 
            none: { updatedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } 
          }
        }
      }),

      // Enrollments this year (for the chart)
      prisma.enrollment.findMany({
        where: { createdAt: { gte: new Date(now.getFullYear(), 0, 1) } },
        select: { createdAt: true }
      }),

      // Total assignments
      prisma.assignment.count(),

      // Pending grading (submissions without a score)
      prisma.assignmentSubmission.count({ where: { score: null } }),

      // Late assignments (past deadline, no submissions)
      prisma.assignment.count({ where: { deadline: { lt: now }, submissions: { none: {} } } }),
    ]);

    const todaysClasses = await getTodayTeacherClasses({
      userId: auth.userId,
      role: auth.role,
    });

    const doubtQueue = openDoubtTickets.map((dt) => ({
      id: dt.id,
      subject: dt.subject,
      priority: dt.priority,
      status: dt.status,
      studentName: dt.student.name,
      studentImage: dt.student.image,
      createdAt: dt.createdAt.toISOString(),
    }));

    const recentActivity = recentReplies.map(r => ({
      title: "Replied to a doubt",
      detail: r.doubtTicket.subject,
      createdAt: r.createdAt.toISOString(),
    }));

    // Calculate progress bars logic based on enrollments count to make it dynamic
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const monthCounts = new Array(12).fill(0);
    enrollmentsThisYear.forEach(e => monthCounts[e.createdAt.getMonth()]++);
    const maxCount = Math.max(...monthCounts, 1); // Avoid div by zero
    // Normalize to 10-100 to make the UI look good if counts are small
    const progressBars = monthNames.map((month, idx) => ({
      month,
      value: Math.max(10, Math.round((monthCounts[idx] / maxCount) * 100))
    }));

    return apiSuccess({
      stats: {
        activeStudents,
        doubtsResolvedToday,
        openDoubtsCount,
        totalEnrollmentsThisWeek: totalEnrollments,
        avgResponseTime: '—',
        studentSatisfaction: 0,
      },
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
        }
      }
    });
  } catch (err) {
    console.error('[GET_TEACHER_STATS_ERROR]', err);
    return apiServerError();
  }
}
