import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiBadRequest,
  apiForbidden,
  apiNotFound,
  apiServerError,
  apiSuccess,
} from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/bundles/[id]
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden();

    const { id } = await params;
    const bundle = await (prisma as any).bundle.findUnique({
      where: { id },
      include: {
        courses: { include: { course: { select: { id: true, title: true, price: true, thumbnail: true } } } },
        _count: { select: { payments: true } },
      },
    });
    if (!bundle) return apiNotFound('Bundle');
    return apiSuccess(bundle);
  } catch (err) {
    console.error('[ADMIN_BUNDLE_GET]', err);
    return apiServerError();
  }
}

/**
 * PATCH /api/admin/bundles/[id]
 * Update a bundle (title, description, price, isPublished, courseIds).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden();

    const { id } = await params;
    const body = await req.json();
    const { title, description, thumbnail, price, courseIds, isPublished } = body;

    const existing = await (prisma as any).bundle.findUnique({ where: { id } });
    if (!existing) return apiNotFound('Bundle');

    // Update course assignments if provided
    if (Array.isArray(courseIds)) {
      if (courseIds.length < 2) return apiBadRequest('A bundle must include at least 2 courses');
      // Replace all bundle courses
      await (prisma as any).bundleCourse.deleteMany({ where: { bundleId: id } });
      await (prisma as any).bundleCourse.createMany({
        data: courseIds.map((courseId: string) => ({ bundleId: id, courseId })),
        skipDuplicates: true,
      });
    }

    const updated = await (prisma as any).bundle.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() ?? null }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(price !== undefined && { price }),
        ...(isPublished !== undefined && { isPublished }),
      },
      include: {
        courses: { include: { course: { select: { id: true, title: true, price: true } } } },
      },
    });

    return apiSuccess(updated);
  } catch (err) {
    console.error('[ADMIN_BUNDLE_PATCH]', err);
    return apiServerError();
  }
}

/**
 * DELETE /api/admin/bundles/[id]
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden();

    const { id } = await params;
    const existing = await (prisma as any).bundle.findUnique({ where: { id } });
    if (!existing) return apiNotFound('Bundle');

    await (prisma as any).bundle.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error('[ADMIN_BUNDLE_DELETE]', err);
    return apiServerError();
  }
}
