import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiNotFound, apiServerError, apiError } from '@/lib/api-response';

type Params = { params: Promise<{ classId: string }> };

/**
 * DELETE /api/admin/live-classes/[classId]
 * Cancels (deletes) a live class. Admin and Super Admin only.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { classId } = await params;

    const existing = await prisma.liveClass.findUnique({
      where: { id: classId },
      select: { id: true, title: true },
    });

    if (!existing) return apiNotFound('Live class');

    await prisma.liveClass.delete({
      where: { id: classId },
    });

    return apiSuccess({ id: classId }, `"${existing.title}" has been cancelled`);
  } catch (err) {
    console.error('[ADMIN_DELETE_LIVE_CLASS_ERROR]', err);
    return apiServerError();
  }
}

/**
 * PATCH /api/admin/live-classes/[classId]
 * Updates a live class. Admin and Super Admin only.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { classId } = await params;
    const body = await req.json();

    const existing = await prisma.liveClass.findUnique({
      where: { id: classId },
      select: { id: true },
    });

    if (!existing) return apiNotFound('Live class');

    const updated = await prisma.liveClass.update({
      where: { id: classId },
      data: {
        title: body.title,
        description: body.description,
        startTime: body.startTime,
        duration: body.duration,
        meetingUrl: body.meetingUrl,
        teacherId: body.teacherId,
        courseId: body.courseId,
      },
    });

    return apiSuccess(updated, 'Live class updated successfully');
  } catch (err) {
    console.error('[ADMIN_UPDATE_LIVE_CLASS_ERROR]', err);
    return apiServerError();
  }
}
