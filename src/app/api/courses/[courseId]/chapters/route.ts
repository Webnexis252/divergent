import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiForbidden, apiServerError, apiSuccess, apiCreated, apiError } from '@/lib/api-response';

type Params = { params: Promise<{ courseId: string }> };

/** GET /api/courses/[courseId]/chapters — list all chapters with lessons */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(_req, ['ADMIN']);
    if (!user) return apiForbidden('Only admins can view chapters');

    const { courseId } = await params;
    const chapters = await prisma.chapter.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
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
    return apiSuccess(chapters);
  } catch (err) {
    console.error('[GET_CHAPTERS_ERROR]', err);
    return apiServerError();
  }
}

/** POST /api/courses/[courseId]/chapters — create a chapter */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['ADMIN']);
    if (!user) return apiForbidden('Only admins can create chapters');

    const { courseId } = await params;
    const body = await req.json();
    const { title, order } = body;

    if (!title?.trim()) return apiError('Chapter title is required', 400);

    // Determine order: count existing chapters if not supplied
    const finalOrder = typeof order === 'number'
      ? order
      : await prisma.chapter.count({ where: { courseId } });

    const chapter = await prisma.chapter.create({
      data: { courseId, title: title.trim(), order: finalOrder },
      include: { lessons: true },
    });
    return apiCreated(chapter, 'Chapter created');
  } catch (err) {
    console.error('[CREATE_CHAPTER_ERROR]', err);
    return apiServerError();
  }
}
