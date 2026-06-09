import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';
import { getLiveClassTeacherAssignmentMap } from '@/lib/live-class-teacher-assignments';

/**
 * GET /api/admin/live-classes
 * Returns all live classes across all courses with course + teacher info.
 * Accessible by ADMIN and SUPER_ADMIN.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const liveClasses = await prisma.liveClass.findMany({
      orderBy: { startTime: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            teachers: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: { 
            attendances: {
              where: { isCounted: true }
            }
          },
        },
      },
    });

    const assignmentMap = await getLiveClassTeacherAssignmentMap();

    const mappedClasses = liveClasses.map(lc => {
      const assignment = assignmentMap.get(lc.id);
      const assignedTeacherId = assignment?.mentorIds?.[0] || null;
      const assignedTeacher = assignedTeacherId 
        ? lc.course.teachers.find(t => t.id === assignedTeacherId) 
        : null;

      return {
        ...lc,
        course: {
          ...lc.course,
          teacher: assignedTeacher || null,
        }
      };
    });

    return apiSuccess(mappedClasses);
  } catch (err) {
    console.error('[ADMIN_GET_LIVE_CLASSES_ERROR]', err);
    return apiServerError();
  }
}
