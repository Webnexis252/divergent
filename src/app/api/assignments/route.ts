import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';

/**
 * GET /api/assignments
 * Returns assignments for the current user.
 * - If STUDENT: Returns assignments for their enrolled courses, along with their submissions.
 * - If MENTOR: Redirect them to use /api/teacher/assignments or just return all their assignments here.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiForbidden();

    if (user.role === 'STUDENT') {
      // Find courses the student is enrolled in
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.userId, status: 'ACTIVE' },
        select: { courseId: true },
      });
      const courseIds = enrollments.map((e) => e.courseId);

      const assignments = await prisma.assignment.findMany({
        where: { courseId: { in: courseIds } },
        include: {
          course: { select: { title: true } },
          submissions: {
            where: { studentId: user.userId },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return apiSuccess(assignments);
    } 
    
    if (user.role === 'MENTOR') {
      // Find courses the teacher teaches
      const courses = await prisma.course.findMany({
        where: { teachers: { some: { id: user.userId } } },
        select: { id: true },
      });
      const courseIds = courses.map((c) => c.id);

      const assignments = await prisma.assignment.findMany({
        where: { courseId: { in: courseIds } },
        include: {
          course: { select: { title: true } },
          submissions: { select: { id: true, score: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return apiSuccess(assignments);
    }

    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      const assignments = await prisma.assignment.findMany({
        include: {
          course: { select: { title: true } },
          submissions: { select: { id: true, score: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return apiSuccess(assignments);
    }

    return apiSuccess([]);
  } catch (err) {
    console.error('[GET_ASSIGNMENTS_ERROR]', err);
    return apiServerError();
  }
}
