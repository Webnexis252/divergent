import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiCreated, apiServerError, apiError } from '@/lib/api-response';
import { NextRequest } from 'next/server';
import { ensureActiveEnrollmentWithXp } from '@/lib/xp';

/**
 * GET /api/admin/cohorts
 * List all cohorts.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const cohorts = await prisma.cohort.findMany({
      include: {
        course: { select: { id: true, title: true } },
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(cohorts);
  } catch (err) {
    console.error('[COHORTS_GET_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/admin/cohorts
 * Create a cohort and bulk-enroll students.
 * Body: { name, courseId, teacherId?, studentIds: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { name, courseId, teacherId, studentIds } = await req.json();
    if (!name?.trim() || !courseId || !Array.isArray(studentIds)) {
      return apiError('name, courseId, and studentIds array are required', 400);
    }

    // Create cohort
    const cohort = await prisma.cohort.create({
      data: {
        name: name.trim(),
        courseId,
        teacherId: teacherId ?? null,
        students: {
          create: studentIds.map((sid: string) => ({ studentId: sid })),
        },
      },
    });

    // Bulk enroll students into the course (upsert = no duplicate errors)
    await Promise.all(
      studentIds.map((sid: string) => ensureActiveEnrollmentWithXp(sid, courseId))
    );

    // Optionally assign the teacher to the course
    if (teacherId) {
      await prisma.course.update({
        where: { id: courseId },
        data: { teachers: { connect: [{ id: teacherId }] } },
      });
    }

    return apiCreated({ cohort, enrolled: studentIds.length });
  } catch (err) {
    console.error('[COHORTS_POST_ERROR]', err);
    return apiServerError();
  }
}
