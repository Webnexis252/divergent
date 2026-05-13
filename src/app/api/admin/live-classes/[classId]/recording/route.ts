import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiForbidden,
  apiNotFound,
  apiServerError,
  apiBadRequest,
} from '@/lib/api-response';

type Params = { params: Promise<{ classId: string }> };

/**
 * PATCH /api/admin/live-classes/[classId]/recording
 * Allows ADMIN / SUPER_ADMIN to set or update the recording URL for a live class.
 * Body: { recordingUrl: string }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { classId } = await params;
    const body = await req.json();
    const { recordingUrl } = body as { recordingUrl?: string };

    if (!recordingUrl || typeof recordingUrl !== 'string' || !recordingUrl.trim()) {
      return apiBadRequest('A valid recording URL is required');
    }

    // Validate URL format
    try {
      new URL(recordingUrl.trim());
    } catch {
      return apiBadRequest('Invalid URL format — please provide a full URL (e.g. https://...)');
    }

    const existing = await prisma.liveClass.findUnique({
      where: { id: classId },
      select: { id: true, title: true },
    });

    if (!existing) return apiNotFound('Live class');

    const updated = await prisma.liveClass.update({
      where: { id: classId },
      data: { recordingUrl: recordingUrl.trim() },
      select: {
        id: true,
        title: true,
        recordingUrl: true,
      },
    });

    return apiSuccess(updated, 'Recording URL saved successfully');
  } catch (err) {
    console.error('[ADMIN_PATCH_RECORDING_ERROR]', err);
    return apiServerError();
  }
}

/**
 * DELETE /api/admin/live-classes/[classId]/recording
 * Removes the recording URL from a live class.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { classId } = await params;

    const existing = await prisma.liveClass.findUnique({
      where: { id: classId },
      select: { id: true },
    });

    if (!existing) return apiNotFound('Live class');

    await prisma.liveClass.update({
      where: { id: classId },
      data: { recordingUrl: null },
    });

    return apiSuccess({ id: classId }, 'Recording URL removed');
  } catch (err) {
    console.error('[ADMIN_DELETE_RECORDING_ERROR]', err);
    return apiServerError();
  }
}
