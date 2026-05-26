import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiUnauthorized,
  apiServerError,
  apiBadRequest,
} from '@/lib/api-response';

/**
 * GET /api/users/me
 * Returns the authenticated user's profile.
 * Response is private-cached for 30 s so rapid re-renders don't spike the DB.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) {
      return new NextResponse(
        JSON.stringify({ success: true, data: null }),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0'
          } 
        }
      );
    }

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
        // Use a count instead of fetching full enrollment+course objects
        _count: { select: { enrollments: true } },
        enrollments: {
          select: {
            id: true,
            status: true,
            progressPercent: true,
            course: {
              select: { id: true, title: true, slug: true, thumbnail: true },
            },
          },
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 20, // cap to avoid huge payloads
        },
        createdDoubts: {
          where: { status: { not: 'CLOSED' } },
          select: { id: true, subject: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!profile) {
      return new NextResponse(
        JSON.stringify({ success: true, data: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new NextResponse(JSON.stringify({ success: true, data: profile }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // 30-second private cache — safe per-user, avoids repeated DB reads on re-renders
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
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

    const updateData: { image?: string; name?: string; phone?: string } = {};

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

    return new NextResponse(JSON.stringify({ success: true, data: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[PATCH_ME_ERROR]', err);
    return apiServerError();
  }
}
