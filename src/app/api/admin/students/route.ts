import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';

/**
 * GET /api/admin/students
 * List all students with optional search and course filter.
 * ADMIN + SUPER_ADMIN only.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';
    const courseId = searchParams.get('courseId');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = 20;
    const skip = (page - 1) * limit;

    const where = {
      role: 'STUDENT' as const,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(courseId && { enrollments: { some: { courseId } } }),
    };

    const [students, total, totalEnrollments, xpAgg] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          streakCount: true,
          xpPoints: true,
          _count: { select: { enrollments: true, createdDoubts: true, assignmentSubmissions: true } },
          enrollments: {
            select: {
              courseId: true,
              status: true,
              progressPercent: true,
              course: { select: { title: true } },
            },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
      prisma.enrollment.count({ where: { user: where } }),
      prisma.user.aggregate({ where, _sum: { xpPoints: true } })
    ]);

    const totalXp = xpAgg._sum.xpPoints || 0;
    const avgXp = total > 0 ? Math.round(totalXp / total) : 0;

    return apiSuccess({ students, total, page, totalPages: Math.ceil(total / limit), totalEnrollments, avgXp });
  } catch (err) {
    console.error('[ADMIN_STUDENTS_ERROR]', err);
    return apiServerError();
  }
}
