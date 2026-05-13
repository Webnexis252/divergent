import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UpdateLessonProgressSchema } from '@/lib/validators';
import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-response';

type Params = { params: Promise<{ lessonId: string }> };

// GET /api/lessons/[lessonId]/progress — fetch completion status for this lesson
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['STUDENT']);
    if (!user) return apiUnauthorized('Only students can track progress');

    const { lessonId } = await params;

    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: user.userId, lessonId } },
      select: { isCompleted: true, watchTime: true },
    });

    return apiSuccess({ isCompleted: progress?.isCompleted ?? false, watchTime: progress?.watchTime ?? 0 });
  } catch (err) {
    console.error('[GET_PROGRESS_ERROR]', err);
    return apiServerError();
  }
}

// PATCH /api/lessons/[lessonId]/progress — mark lesson complete & recalculate enrollment progress
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['STUDENT']);
    if (!user) return apiUnauthorized('Only students can track progress');

    const { lessonId } = await params;

    // Ensure lesson exists and get its course info
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: {
          select: {
            courseId: true,
          },
        },
      },
    });
    if (!lesson) return apiError('Lesson not found', 404);

    const courseId = lesson.chapter.courseId;

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.userId, courseId } },
    });
    if (!enrollment) return apiError('You are not enrolled in this course', 403);

    const body = await req.json();
    const parsed = UpdateLessonProgressSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const { isCompleted, watchTimeAdded } = parsed.data;

    // Upsert lesson progress
    const progress = await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.userId, lessonId } },
      create: {
        userId: user.userId,
        lessonId,
        isCompleted: isCompleted ?? false,
        watchTime: watchTimeAdded ?? 0,
      },
      update: {
        ...(isCompleted !== undefined && { isCompleted }),
        ...(watchTimeAdded && watchTimeAdded > 0 && { watchTime: { increment: watchTimeAdded } }),
      },
    });

    // ── Recalculate real progressPercent ───────────────────────────────────────
    // Count all published lessons in this course
    const [totalLessons, completedLessons] = await Promise.all([
      prisma.lesson.count({
        where: {
          chapter: { courseId, isPublished: true },
          isPublished: true,
        },
      }),
      prisma.lessonProgress.count({
        where: {
          userId: user.userId,
          isCompleted: true,
          lesson: {
            isPublished: true,
            chapter: { courseId, isPublished: true },
          },
        },
      }),
    ]);

    const newProgressPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Update enrollment progressPercent (and mark COMPLETED if 100%)
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPercent: newProgressPercent,
        ...(newProgressPercent === 100 && { status: 'COMPLETED' }),
      },
    });

    // Also update global study time
    if (watchTimeAdded && watchTimeAdded > 0) {
      await prisma.user.update({
        where: { id: user.userId },
        data: { totalStudyTime: { increment: watchTimeAdded } },
      });
    }

    return apiSuccess(
      {
        isCompleted: progress.isCompleted,
        watchTime: progress.watchTime,
        completedLessons,
        totalLessons,
        progressPercent: newProgressPercent,
      },
      'Progress updated',
    );
  } catch (err) {
    console.error('[UPDATE_PROGRESS_ERROR]', err);
    return apiServerError();
  }
}
