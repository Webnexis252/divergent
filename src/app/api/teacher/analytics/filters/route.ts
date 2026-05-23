import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';

/**
 * GET /api/teacher/analytics/filters
 * Returns all courses and their cohorts (batches) for use in the analytics filter dropdowns.
 * Accessible by MENTOR, ADMIN, SUPER_ADMIN.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Only mentors and admins can access analytics');

    // Admins/Super Admins see all courses; mentors only see their own
    const courseWhere =
      user.role === 'MENTOR'
        ? { teachers: { some: { id: user.userId } } }
        : {};

    const courses = await prisma.course.findMany({
      where: courseWhere,
      select: {
        id: true,
        title: true,
        cohorts: {
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { title: 'asc' },
    });

    return apiSuccess({ courses });
  } catch (err) {
    console.error('[GET_ANALYTICS_FILTERS_ERROR]', err);
    return apiServerError();
  }
}
