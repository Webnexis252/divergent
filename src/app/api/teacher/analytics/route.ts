import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiForbidden,
  apiServerError,
} from '@/lib/api-response';

/**
 * GET /api/teacher/analytics
 * Returns aggregated class analytics for MENTOR/ADMIN users.
 * Supports optional ?courseId= and ?days= query params.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Only mentors and admins can access analytics');

    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '7', 10), 1), 365);
    const courseId = searchParams.get('courseId') ?? undefined;
    const cohortId = searchParams.get('cohortId') ?? undefined;

    const now = new Date();
    const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Resolve cohort → student IDs for filtering
    let cohortUserIds: string[] | undefined;
    if (cohortId) {
      const members = await prisma.cohortStudent.findMany({
        where: { cohortId },
        select: { studentId: true },
      });
      cohortUserIds = members.map((m) => m.studentId);
    }

    // ── Parallel queries ────────────────────────────────────────────────────
    const [
      activeStudents,
      doubtsResolved,
      totalDoubts,
      openDoubts,
      lessonProgressRows,
      recentEnrollments,
      topStudents,
      allEnrollments,
    ] = await Promise.all([
      // Active unique students enrolled
      prisma.enrollment.groupBy({
        by: ['userId'],
        where: {
          status: 'ACTIVE',
          ...(courseId ? { courseId } : {}),
          ...(cohortUserIds ? { userId: { in: cohortUserIds } } : {}),
        },
      }).then((g) => g.length),

      // Doubts resolved in window
      prisma.doubtTicket.count({
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] },
          updatedAt: { gte: windowStart },
          ...(cohortUserIds ? { studentId: { in: cohortUserIds } } : {}),
        },
      }),

      // Total doubts in window
      prisma.doubtTicket.count({
        where: {
          createdAt: { gte: windowStart },
          ...(cohortUserIds ? { studentId: { in: cohortUserIds } } : {}),
        },
      }),

      // Currently open doubts
      prisma.doubtTicket.count({
        where: {
          status: { in: ['OPEN', 'ASSIGNED'] },
          ...(cohortUserIds ? { studentId: { in: cohortUserIds } } : {}),
        },
      }),

      // Lesson progress for video completion rate
      prisma.lessonProgress.findMany({
        where: {
          updatedAt: { gte: windowStart },
          ...(cohortUserIds ? { userId: { in: cohortUserIds } } : {}),
        },
        select: { isCompleted: true, userId: true },
      }),

      // New enrollments per day in window (for trend)
      prisma.enrollment.findMany({
        where: {
          createdAt: { gte: windowStart },
          ...(courseId ? { courseId } : {}),
          ...(cohortUserIds ? { userId: { in: cohortUserIds } } : {}),
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),

      // Top students query removed as we calculate this via performance score now
      Promise.resolve([]),

      // All enrollments to compute performance scores
      prisma.enrollment.findMany({
        where: {
          status: 'ACTIVE',
          ...(courseId ? { courseId } : {}),
          ...(cohortUserIds ? { userId: { in: cohortUserIds } } : {}),
        },
        include: {
          user: { select: { id: true, name: true, totalStudyTime: true, streakCount: true, xpPoints: true } },
          course: { select: { id: true, title: true } },
        },
      }),
    ]);

    // ── Compute metrics ──────────────────────────────────────────────────────

    // Video completion %: completed / total lesson progress rows
    const videoCompletionRate = lessonProgressRows.length > 0
      ? Math.round((lessonProgressRows.filter((r) => r.isCompleted).length / lessonProgressRows.length) * 100)
      : 0;

    // Drop-off: students with 0 lesson progress in window / total active
    const activeStudentIds = new Set(lessonProgressRows.map((r) => r.userId));
    const dropOffRate = activeStudents > 0
      ? Math.round(((activeStudents - activeStudentIds.size) / activeStudents) * 100)
      : 0;

    // Weekly trend: enrollments per day for each of the last `days` days
    const trendData: { label: string; value: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const label = dayStart.toLocaleDateString('en-IN', { weekday: 'short' });
      const value = recentEnrollments.filter((e) => {
        const d = new Date(e.createdAt);
        return d >= dayStart && d <= dayEnd;
      }).length;
      trendData.push({ label, value });
    }

    // ── Performance Score Calculation ───────────────────────────────────────
    
    const activeStudentIdsList = Array.from(new Set(allEnrollments.map((e) => e.userId)));
    const activeCourseIdsList = Array.from(new Set(allEnrollments.map((e) => e.courseId)));

    // Fetch aggregates for performance calculation
    const [
      testAttempts,
      attendances,
      submissions,
      totalClassesByCourse,
      totalAssignmentsByCourse,
    ] = await Promise.all([
      prisma.testAttempt.groupBy({
        by: ['userId'],
        where: { userId: { in: activeStudentIdsList } },
        _sum: { pointsEarned: true, totalPoints: true },
      }),
      prisma.attendance.groupBy({
        by: ['userId'],
        where: { userId: { in: activeStudentIdsList }, isCounted: true },
        _count: { id: true },
      }),
      prisma.assignmentSubmission.groupBy({
        by: ['studentId'],
        where: { studentId: { in: activeStudentIdsList } },
        _count: { id: true },
      }),
      prisma.liveClass.groupBy({
        by: ['courseId'],
        where: { courseId: { in: activeCourseIdsList }, startTime: { lte: now } },
        _count: { id: true },
      }),
      prisma.assignment.groupBy({
        by: ['courseId'],
        where: { courseId: { in: activeCourseIdsList } },
        _count: { id: true },
      }),
    ]);

    // Map course totals
    const classCountMap = new Map<string, number>(totalClassesByCourse.map((c) => [c.courseId as string, Number(c._count.id)]));
    const assignmentCountMap = new Map<string, number>(totalAssignmentsByCourse.map((a) => [a.courseId as string, Number(a._count.id)]));

    // Map student metrics
    const testMap = new Map<string, { pointsEarned: number | null, totalPoints: number | null }>(testAttempts.map((t) => [t.userId as string, t._sum as any]));
    const attendanceMap = new Map<string, number>(attendances.map((a) => [a.userId as string, Number(a._count.id)]));
    const submissionMap = new Map<string, number>(submissions.map((s) => [s.studentId as string, Number(s._count.id)]));

    // Group enrollments by student to calculate their total expectations
    const studentsPerfMap = new Map<string, {
      user: { id: string, name: string, streakCount: number },
      courses: { id: string, title: string }[],
      expectedClasses: number,
      expectedAssignments: number,
      attendedClasses: number,
      submittedAssignments: number,
      pointsEarned: number,
      totalPoints: number,
      perfScore: number,
    }>();

    for (const e of allEnrollments) {
      if (!studentsPerfMap.has(e.userId)) {
        studentsPerfMap.set(e.userId, {
          user: { id: e.user.id, name: e.user.name ?? 'Unknown', streakCount: e.user.streakCount },
          courses: [],
          expectedClasses: 0,
          expectedAssignments: 0,
          attendedClasses: attendanceMap.get(e.userId) ?? 0,
          submittedAssignments: submissionMap.get(e.userId) ?? 0,
          pointsEarned: testMap.get(e.userId)?.pointsEarned ?? 0,
          totalPoints: testMap.get(e.userId)?.totalPoints ?? 0,
          perfScore: 0,
        });
      }
      const s = studentsPerfMap.get(e.userId)!;
      s.courses.push({ id: e.courseId, title: e.course.title });
      s.expectedClasses += classCountMap.get(e.courseId) ?? 0;
      s.expectedAssignments += assignmentCountMap.get(e.courseId) ?? 0;
    }

    // Calculate the Performance Score
    // Formula: 40% Exams + 30% Attendance + 30% Assignments
    const studentsPerfList = Array.from(studentsPerfMap.values()).map((s) => {
      const examRatio = s.totalPoints > 0 ? (s.pointsEarned / s.totalPoints) : 0;
      const attendanceRatio = s.expectedClasses > 0 ? Math.min(1, s.attendedClasses / s.expectedClasses) : 0;
      const assignmentRatio = s.expectedAssignments > 0 ? Math.min(1, s.submittedAssignments / s.expectedAssignments) : 0;

      // Base it out of 100
      const examScore = examRatio * 100 * 0.40;
      const attScore = attendanceRatio * 100 * 0.30;
      const assScore = assignmentRatio * 100 * 0.30;

      // If a student has no expected classes or assignments, the weights might be skewed.
      // But for simplicity, we stick to the rigid formula. If they have none, they get 0 for that section.
      let perfScore = examScore + attScore + assScore;

      // Special case: if there are no expectations across the board, default to 0.
      if (s.totalPoints === 0 && s.expectedClasses === 0 && s.expectedAssignments === 0) {
        perfScore = 0;
      }

      return {
        ...s,
        perfScore: Math.round(perfScore),
      };
    });

    // ── Filter Needs Attention ──────────────────────────────────────────────
    // All students below 40% threshold
    const needsAttentionList = studentsPerfList
      .filter((s) => s.perfScore < 40)
      .sort((a, b) => a.perfScore - b.perfScore)
      .map((s) => ({
        id: s.user.id,
        name: s.user.name,
        detail: `Performance: ${s.perfScore}%`,
        streakCount: s.user.streakCount,
      }));

    // ── Filter Top Performers ───────────────────────────────────────────────
    // Top 5 of each course.
    const topPerformersList: { id: string, name: string, detail: string, streakCount: number }[] = [];
    const processedTopStudents = new Set<string>();

    // If a specific course is selected via filter, we only have one course.
    // If "All Courses" is selected, we group by course, pick top 5 for each course.
    const courseGroupedStudents = new Map<string, typeof studentsPerfList>();
    
    for (const s of studentsPerfList) {
      for (const c of s.courses) {
        if (!courseGroupedStudents.has(c.id)) {
          courseGroupedStudents.set(c.id, []);
        }
        courseGroupedStudents.get(c.id)!.push(s);
      }
    }

    for (const [cId, courseStudents] of Array.from(courseGroupedStudents.entries())) {
      // Filter out students who are in the 'needs attention' category
      const validStudents = courseStudents.filter((s) => s.perfScore >= 40);
      // Sort desc by perfScore
      validStudents.sort((a, b) => b.perfScore - a.perfScore);
      // Take top 5
      const top5 = validStudents.slice(0, 5);
      for (const s of top5) {
        if (!processedTopStudents.has(s.user.id)) {
          processedTopStudents.add(s.user.id);
          const cName = s.courses.find(c => c.id === cId)?.title ?? '';
          topPerformersList.push({
            id: s.user.id,
            name: s.user.name,
            detail: `${s.perfScore}% in ${cName} · ${s.user.streakCount}🔥 streak`,
            streakCount: s.user.streakCount,
          });
        }
      }
    }

    // Limit top performers to avoid massive lists if many courses are active, 
    // or sort them globally among the chosen ones.
    topPerformersList.sort((a, b) => parseInt(b.detail) - parseInt(a.detail));


    return apiSuccess({
      metrics: {
        activeStudents,
        doubtsResolved,
        totalDoubts,
        openDoubts,
        videoCompletionRate,
        dropOffRate,
      },
      trendData,
      topStudents: topPerformersList.slice(0, 15), // Hard cap to avoid UI overflow
      needsAttention: needsAttentionList,
    });
  } catch (err) {
    console.error('[GET_TEACHER_ANALYTICS_ERROR]', err);
    return apiServerError();
  }
}
