import { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiCreated, apiServerError, apiError } from '@/lib/api-response';
import { NextRequest } from 'next/server';

async function getAccessibleCourseIdForResource(
  userId: string,
  role: UserRole,
  courseId: string | null | undefined,
) {
  const trimmedCourseId = courseId?.trim();
  if (!trimmedCourseId) {
    return null;
  }

  const course = await prisma.course.findFirst({
    where:
      role === 'MENTOR'
        ? { id: trimmedCourseId, teachers: { some: { id: userId } } }
        : { id: trimmedCourseId },
    select: { id: true },
  });

  return course?.id ?? null;
}

/**
 * GET /api/teacher/resources
 * List all resources uploaded by the authenticated teacher.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Teacher access required');

    const resources = await prisma.teacherResource.findMany({
      where: { teacherId: auth.userId },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(resources);
  } catch (err) {
    console.error('[TEACHER_RESOURCES_GET_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/teacher/resources
 * Upload a new course resource for students enrolled in that course.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Teacher access required');

    const { title, fileUrl, type, courseId } = await req.json();
    if (!title?.trim() || !fileUrl?.trim()) {
      return apiError('Title and File URL are required', 400);
    }

    const accessibleCourseId = await getAccessibleCourseIdForResource(auth.userId, auth.role, courseId);
    if (!accessibleCourseId) {
      return apiError('Please choose a valid course before saving this resource', 400);
    }

    const resource = await prisma.teacherResource.create({
      data: {
        teacherId: auth.userId,
        courseId: accessibleCourseId,
        title: title.trim(),
        fileUrl: fileUrl.trim(),
        type: type ?? 'PDF',
      },
    });

    return apiCreated(resource);
  } catch (err) {
    console.error('[TEACHER_RESOURCES_POST_ERROR]', err);
    return apiServerError();
  }
}

/**
 * PATCH /api/teacher/resources
 * Update the course assignment of an uploaded resource.
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Teacher access required');

    const { id, courseId } = await req.json();
    if (!id?.trim()) {
      return apiError('Resource ID is required', 400);
    }

    const accessibleCourseId = await getAccessibleCourseIdForResource(auth.userId, auth.role, courseId);
    if (!accessibleCourseId) {
      return apiError('Please choose a valid course for this resource', 400);
    }

    const resource = await prisma.teacherResource.findFirst({
      where: { id: id.trim(), teacherId: auth.userId },
      select: { id: true },
    });

    if (!resource) {
      return apiError('Resource not found', 404);
    }

    const updatedResource = await prisma.teacherResource.update({
      where: { id: resource.id },
      data: { courseId: accessibleCourseId },
      include: { course: { select: { id: true, title: true } } },
    });

    return apiSuccess(updatedResource, 'Resource course updated successfully');
  } catch (err) {
    console.error('[TEACHER_RESOURCES_PATCH_ERROR]', err);
    return apiServerError();
  }
}

/**
 * DELETE /api/teacher/resources?id=...
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Teacher access required');

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return apiError('Resource ID required', 400);

    await prisma.teacherResource.deleteMany({
      where: { id, teacherId: auth.userId },
    });

    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error('[TEACHER_RESOURCES_DELETE_ERROR]', err);
    return apiServerError();
  }
}
