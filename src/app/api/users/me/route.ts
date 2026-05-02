import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiUnauthorized,
  apiServerError,
  apiBadRequest,
} from '@/lib/api-response';

/**
 * GET /api/users/me
 * Returns the authenticated user's profile with enrollments and stats.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const profile = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        image: true,
        streakCount: true,
        totalStudyTime: true,
        createdAt: true,
        enrollments: {
          include: {
            course: {
              select: { id: true, title: true, slug: true, thumbnail: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        createdDoubts: {
          where: { status: { not: 'CLOSED' } },
          select: { id: true, subject: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!profile) return apiSuccess(null);

    return apiSuccess(profile);
  } catch (err) {
    console.error('[GET_ME_ERROR]', err);
    return apiServerError();
  }
}

/**
 * PATCH /api/users/me
 * Updates the authenticated user's profile (currently: image only).
 * Accepts a JSON body: { image: string } — a data URL or remote URL.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const body = await req.json();
    const { image, name, phone } = body as { image?: string; name?: string; phone?: string };

    const updateData: any = {};

    if (image !== undefined) {
      if (typeof image !== 'string') {
        return apiBadRequest('image must be a string');
      }
      const isDataUrl = image.startsWith('data:image/');
      const isHttpsUrl = image.startsWith('https://');
      if (!isDataUrl && !isHttpsUrl) {
        return apiBadRequest('image must be a valid data URL or HTTPS URL');
      }
      updateData.image = image;
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return apiBadRequest('name must be a non-empty string');
      }
      updateData.name = name.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string') {
        return apiBadRequest('phone must be a string');
      }
      updateData.phone = phone.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return apiBadRequest('No valid fields provided for update');
    }

    const updated = await prisma.user.update({
      where: { id: user.userId },
      data: updateData,
      select: { id: true, name: true, phone: true, image: true },
    });

    return apiSuccess(updated);
  } catch (err) {
    console.error('[PATCH_ME_ERROR]', err);
    return apiServerError();
  }
}
