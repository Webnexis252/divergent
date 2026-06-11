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
    const bundle = await prisma.bundle.findUnique({
      where: { id },
      include: {
        courses: { include: { 
          course: { select: { id: true, title: true, price: true, thumbnail: true } },
          teachers: { select: { id: true, name: true, image: true } }
        } },
        _count: { select: { payments: true } },
      },
    });
    if (!bundle) return apiNotFound('Bundle');
    return apiSuccess(bundle);
  } catch (err) {
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

    const existing = await prisma.bundle.findUnique({ where: { id } });
    if (!existing) return apiNotFound('Bundle');

    // Build the data object for bundle update explicitly
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (price !== undefined) updateData.price = price;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    // Use a transaction so deleteMany + creates are atomic
    const updated = await prisma.$transaction(async (tx) => {
      // Update course assignments if provided
      if (Array.isArray(body.courses)) {
        if (body.courses.length < 2) throw new Error('VALIDATION:A bundle must include at least 2 courses');

        // Delete existing bundle-course associations
        await tx.bundleCourse.deleteMany({ where: { bundleId: id } });

        // Re-create bundle-course associations with optional teacher assignments
        for (const c of body.courses) {
          const bcData: any = {
            bundle: { connect: { id } },
            course: { connect: { id: c.courseId } },
          };
          if (Array.isArray(c.teacherIds) && c.teacherIds.length > 0) {
            bcData.teachers = {
              connect: c.teacherIds.map((tId: string) => ({ id: tId })),
            };
          }
          await tx.bundleCourse.create({ data: bcData });
        }
      } else if (Array.isArray(courseIds)) {
        if (courseIds.length < 2) throw new Error('VALIDATION:A bundle must include at least 2 courses');

        await tx.bundleCourse.deleteMany({ where: { bundleId: id } });
        await tx.bundleCourse.createMany({
          data: courseIds.map((cId: string) => ({ bundleId: id, courseId: cId })),
          skipDuplicates: true,
        });
      }

      // Update the bundle itself
      return tx.bundle.update({
        where: { id },
        data: updateData,
        include: {
          courses: {
            include: {
              course: { select: { id: true, title: true, price: true } },
              teachers: { select: { id: true, name: true, image: true } },
            },
          },
        },
      });
    });

    return apiSuccess(updated);
  } catch (err: any) {
    console.error('[ADMIN_BUNDLE_PATCH]', err);
    // Surface validation errors back to the client
    if (typeof err?.message === 'string' && err.message.startsWith('VALIDATION:')) {
      return apiBadRequest(err.message.replace('VALIDATION:', ''));
    }
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
    const existing = await prisma.bundle.findUnique({ where: { id } });
    if (!existing) return apiNotFound('Bundle');

    await prisma.bundle.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error('[ADMIN_BUNDLE_DELETE]', err);
    return apiServerError();
  }
}
