import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UpdateCourseSchema } from '@/lib/validators';
import {
  apiSuccess,
  apiError,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

type Params = { params: Promise<{ courseId: string }> };

const courseTeacherSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

/**
 * GET /api/courses/[courseId]
 * Public: Returns a single course with full structure (chapters + lessons).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { courseId } = await params;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teachers: { select: courseTeacherSelect },
        chapters: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { order: 'asc' },
              select: {
                id: true, title: true, contentType: true,
                isFreePreview: true, order: true,
              },
            },
          },
        },
      },
    });

    if (!course) return apiNotFound('Course');
    return apiSuccess(course);
  } catch (err) {
    console.error('[GET_COURSE_ERROR]', err);
    return apiServerError();
  }
}

/**
 * PATCH /api/courses/[courseId]
 * Admin only: Update course details or publish/unpublish.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['ADMIN']);
    if (!user) return apiForbidden('Only admins can update courses');

    const { courseId } = await params;
    const body = await req.json();
    const parsed = UpdateCourseSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, parsed.error.flatten());
    }

    if (parsed.data.teacherIds && parsed.data.teacherIds.length > 0) {
      const validTeachers = await prisma.user.count({
        where: {
          id: { in: parsed.data.teacherIds },
          role: { in: ['MENTOR', 'ADMIN', 'SUPER_ADMIN'] },
        },
      });

      if (validTeachers !== parsed.data.teacherIds.length) {
        return apiError('One or more selected teachers were not found or are not eligible.', 400);
      }
    }

    const { teacherIds, ...restData } = parsed.data;

    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...restData,
        teachers: teacherIds ? { set: teacherIds.map((id) => ({ id })) } : undefined,
      },
      include: {
        _count: { select: { chapters: true, enrollments: true } },
        teachers: { select: courseTeacherSelect },
      },
    });

    return apiSuccess(course, 'Course updated successfully');
  } catch (err) {
    console.error('[UPDATE_COURSE_ERROR]', err);
    return apiServerError();
  }
}

/**
 * DELETE /api/courses/[courseId]
 * Admin only: Delete a course and all its chapters/lessons (cascade).
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['ADMIN']);
    if (!user) return apiForbidden('Only admins can delete courses');

    const { courseId } = await params;
    await prisma.course.delete({ where: { id: courseId } });

    return apiSuccess(null, 'Course deleted successfully');
  } catch (err) {
    console.error('[DELETE_COURSE_ERROR]', err);
    return apiServerError();
  }
}
