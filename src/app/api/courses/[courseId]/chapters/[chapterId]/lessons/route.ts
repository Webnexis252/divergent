import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiForbidden, apiServerError, apiCreated, apiError } from '@/lib/api-response';

type Params = { params: Promise<{ courseId: string; chapterId: string }> };

/** POST /api/courses/[courseId]/chapters/[chapterId]/lessons — create a lesson */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['ADMIN']);
    if (!user) return apiForbidden('Only admins can create lessons');

    const { courseId, chapterId } = await params;
    const body = await req.json();
    const { title, contentType, contentUrl, bodyText, isFreePreview, durationMins, order } = body;

    if (!title?.trim()) return apiError('Lesson title is required', 400);

    // Verify chapter belongs to course
    const chapter = await prisma.chapter.findFirst({ where: { id: chapterId, courseId } });
    if (!chapter) return apiError('Chapter not found', 404);

    const finalOrder = typeof order === 'number'
      ? order
      : await prisma.lesson.count({ where: { chapterId } });

    const lesson = await prisma.lesson.create({
      data: {
        chapterId,
        title: title.trim(),
        contentType: contentType || 'VIDEO',
        contentUrl: contentUrl || null,
        bodyText: bodyText || null,
        isFreePreview: Boolean(isFreePreview),
        durationMins: durationMins ? Number(durationMins) : 0,
        order: finalOrder,
      },
    });
    return apiCreated(lesson, 'Lesson created');
  } catch (err) {
    console.error('[CREATE_LESSON_ERROR]', err);
    return apiServerError();
  }
}
