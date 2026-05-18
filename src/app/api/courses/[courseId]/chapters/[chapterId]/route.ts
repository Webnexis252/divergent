import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiForbidden, apiServerError, apiSuccess, apiError, apiNotFound } from '@/lib/api-response';

type Params = { params: Promise<{ courseId: string; chapterId: string }> };

/** PATCH /api/courses/[courseId]/chapters/[chapterId] — update chapter */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['ADMIN']);
    if (!user) return apiForbidden('Only admins can edit chapters');

    const { courseId, chapterId } = await params;
    const body = await req.json();
    const { title, order, isPublished } = body;

    const existing = await prisma.chapter.findFirst({ where: { id: chapterId, courseId } });
    if (!existing) return apiNotFound('Chapter');

    const chapter = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(order !== undefined && { order: Number(order) }),
        ...(isPublished !== undefined && { isPublished: Boolean(isPublished) }),
      },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          select: {
            id: true, title: true, order: true, contentType: true,
            isFreePreview: true, isPublished: true, durationMins: true,
            contentUrl: true, bodyText: true,
          },
        },
      },
    });
    return apiSuccess(chapter, 'Chapter updated');
  } catch (err) {
    console.error('[UPDATE_CHAPTER_ERROR]', err);
    return apiServerError();
  }
}

/** DELETE /api/courses/[courseId]/chapters/[chapterId] — delete chapter */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['ADMIN']);
    if (!user) return apiForbidden('Only admins can delete chapters');

    const { courseId, chapterId } = await params;

    const existing = await prisma.chapter.findFirst({ where: { id: chapterId, courseId } });
    if (!existing) return apiNotFound('Chapter');

    await prisma.chapter.delete({ where: { id: chapterId } });
    return apiSuccess(null, 'Chapter deleted');
  } catch (err) {
    console.error('[DELETE_CHAPTER_ERROR]', err);
    return apiServerError();
  }
}
