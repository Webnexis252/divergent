import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';

/**
 * GET /api/teacher/courses
 * Returns courses available to the authenticated teacher/admin.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Only teachers can access this endpoint');

    const courses = await prisma.course.findMany({
      where:
        user.role === 'MENTOR'
          ? { teachers: { some: { id: user.userId } } }
          : undefined,
      select: { id: true, title: true, slug: true },
      orderBy: { title: 'asc' },
    });

    return apiSuccess(courses);
  } catch (err) {
    console.error('[GET_TEACHER_COURSES_ERROR]', err);
    return apiServerError();
  }
}
