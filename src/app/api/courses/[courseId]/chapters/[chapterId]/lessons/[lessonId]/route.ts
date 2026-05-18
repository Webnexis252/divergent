import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiForbidden, apiServerError, apiSuccess, apiNotFound } from '@/lib/api-response';

type Params = { params: Promise<{ courseId: string; chapterId: string; lessonId: string }> };

/** PATCH /api/courses/[courseId]/chapters/[chapterId]/lessons/[lessonId] */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['ADMIN']);
    if (!user) return apiForbidden('Only admins can edit lessons');

    const { courseId, chapterId, lessonId } = await params;
    const body = await req.json();

    // Verify chain
    const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, courseId } });
    if (!chapter) return apiNotFound('Chapter');
    const existing = await prisma.lesson.findFirst({ where: { id: lessonId, chapterId } });
    if (!existing) return apiNotFound('Lesson');

    const { title, contentType, contentUrl, bodyText, isFreePreview, durationMins, isPublished, order } = body;

    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(title !== undefined && { title: String(title).trim() }),
        ...(contentType !== undefined && { contentType }),
        ...(contentUrl !== undefined && { contentUrl: contentUrl || null }),
        ...(bodyText !== undefined && { bodyText: bodyText || null }),
        ...(isFreePreview !== undefined && { isFreePreview: Boolean(isFreePreview) }),
        ...(durationMins !== undefined && { durationMins: Number(durationMins) }),
        ...(isPublished !== undefined && { isPublished: Boolean(isPublished) }),
        ...(order !== undefined && { order: Number(order) }),
      },
    });
    return apiSuccess(lesson, 'Lesson updated');
  } catch (err) {
    console.error('[UPDATE_LESSON_ERROR]', err);
    return apiServerError();
  }
}

/** DELETE /api/courses/[courseId]/chapters/[chapterId]/lessons/[lessonId] */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['ADMIN']);
    if (!user) return apiForbidden('Only admins can delete lessons');

    const { courseId, chapterId, lessonId } = await params;

    const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, courseId } });
    if (!chapter) return apiNotFound('Chapter');
    const existing = await prisma.lesson.findFirst({ where: { id: lessonId, chapterId } });
    if (!existing) return apiNotFound('Lesson');

    await prisma.lesson.delete({ where: { id: lessonId } });
    return apiSuccess(null, 'Lesson deleted');
  } catch (err) {
    console.error('[DELETE_LESSON_ERROR]', err);
    return apiServerError();
  }
}
