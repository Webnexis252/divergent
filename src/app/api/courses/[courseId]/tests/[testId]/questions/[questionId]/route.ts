import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CreateTestQuestionSchema } from '@/lib/validators';
import { reindexQuestionsBySection } from '@/lib/test-question-sections';
import {
  apiSuccess,
  apiError,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

type Params = {
  params: Promise<{ courseId: string; testId: string; questionId: string }>;
};

/**
 * PATCH /api/courses/[courseId]/tests/[testId]/questions/[questionId]
 * Admin/Mentor: Edit a single question
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { courseId, testId, questionId } = await params;
    const user = await requireAuth(req, ['ADMIN', 'MENTOR']);
    if (!user) return apiForbidden('Only admins/mentors can edit questions');

    // Verify the question belongs to this test and course
    const question = await prisma.testQuestion.findFirst({
      where: { id: questionId, testId, test: { courseId } },
      select: { id: true },
    });
    if (!question) return apiNotFound('Question');

    const body = await req.json();
    const parsed = CreateTestQuestionSchema.partial().safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, parsed.error.flatten());
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextQuestion = await tx.testQuestion.update({
        where: { id: questionId },
        data: parsed.data,
      });

      const testQuestions = await tx.testQuestion.findMany({
        where: { testId },
        orderBy: { order: 'asc' },
      });
      const reorderedQuestions = reindexQuestionsBySection(testQuestions);

      await Promise.all(
        reorderedQuestions.map((item) =>
          tx.testQuestion.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        )
      );

      return nextQuestion;
    });

    return apiSuccess(updated, 'Question updated successfully');
  } catch (err) {
    console.error('[UPDATE_TEST_QUESTION_ERROR]', err);
    return apiServerError();
  }
}

/**
 * DELETE /api/courses/[courseId]/tests/[testId]/questions/[questionId]
 * Admin/Mentor: Remove a question from a test
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { courseId, testId, questionId } = await params;
    const user = await requireAuth(req, ['ADMIN', 'MENTOR']);
    if (!user) return apiForbidden('Only admins/mentors can delete questions');

    const question = await prisma.testQuestion.findFirst({
      where: { id: questionId, testId, test: { courseId } },
      select: { id: true },
    });
    if (!question) return apiNotFound('Question');

    await prisma.$transaction(async (tx) => {
      await tx.testQuestion.delete({ where: { id: questionId } });

      const testQuestions = await tx.testQuestion.findMany({
        where: { testId },
        orderBy: { order: 'asc' },
      });
      const reorderedQuestions = reindexQuestionsBySection(testQuestions);

      await Promise.all(
        reorderedQuestions.map((item) =>
          tx.testQuestion.update({
            where: { id: item.id },
            data: { order: item.order },
          })
        )
      );
    });
    return apiSuccess({ deleted: true }, 'Question deleted');
  } catch (err) {
    console.error('[DELETE_TEST_QUESTION_ERROR]', err);
    return apiServerError();
  }
}
