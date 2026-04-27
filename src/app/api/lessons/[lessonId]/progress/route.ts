import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UpdateLessonProgressSchema } from '@/lib/validators';
import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-response';

type Params = { params: Promise<{ lessonId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['STUDENT']);
    if (!user) return apiUnauthorized('Only students can track progress');

    const { lessonId } = await params;
    
    // Ensure lesson exists and user is enrolled in its course
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { chapter: true }
    });
    if (!lesson) return apiError('Lesson not found', 404);

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.userId, courseId: lesson.chapter.courseId } }
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
        isCompleted: isCompleted || false,
        watchTime: watchTimeAdded || 0,
      },
      update: {
        isCompleted: isCompleted !== undefined ? isCompleted : undefined,
        watchTime: watchTimeAdded ? { increment: watchTimeAdded } : undefined,
      },
    });

    // Also update global study time
    if (watchTimeAdded && watchTimeAdded > 0) {
      await prisma.user.update({
        where: { id: user.userId },
        data: { totalStudyTime: { increment: watchTimeAdded } }
      });
    }

    return apiSuccess(progress, 'Progress updated');
  } catch (err) {
    console.error('[UPDATE_PROGRESS_ERROR]', err);
    return apiServerError();
  }
}
