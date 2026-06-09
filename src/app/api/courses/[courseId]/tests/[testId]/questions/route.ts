import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CreateTestQuestionSchema, type CreateTestQuestionInput } from '@/lib/validators';
import { reindexQuestionsBySection } from '@/lib/test-question-sections';
import {
  apiCreated,
  apiError,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

/**
 * POST /api/courses/[courseId]/tests/[testId]/questions
 * Admin/Mentor: Add one or more questions to a test
 * Body can be a single question object OR an array of questions
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; testId: string }> }
) {
  try {
    const { courseId, testId } = await params;
    const user = await requireAuth(req, ['ADMIN', 'MENTOR']);
    if (!user) return apiForbidden('Only admins/mentors can add questions');

    // Verify test exists and belongs to this course
    const test = await prisma.courseTest.findFirst({
      where: { id: testId, courseId },
      select: { id: true },
    });
    if (!test) return apiNotFound('Test');

    const body = await req.json();
    const questionsInput = Array.isArray(body) ? body : [body];

    // Validate each question
    const validatedQuestions: CreateTestQuestionInput[] = [];
    for (let i = 0; i < questionsInput.length; i++) {
      const parsed = CreateTestQuestionSchema.safeParse(questionsInput[i]);
      if (!parsed.success) {
        return apiError(
          `Question ${i + 1}: validation failed`,
          400,
          parsed.error.flatten()
        );
      }
      validatedQuestions.push(parsed.data);
    }

    const { createdCount, allQuestions } = await prisma.$transaction(async (tx) => {
      const lastQuestion = await tx.testQuestion.findFirst({
        where: { testId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      const startOrder = (lastQuestion?.order ?? -1) + 1;

      const created = await tx.testQuestion.createMany({
        data: validatedQuestions.map((q, i) => ({
          testId,
          type: q.type,
          category: q.category,
          prompt: q.prompt,
          explanation: q.explanation,
          explanationImageUrl: q.explanationImageUrl,
          options: q.options,
          correctAnswer: q.correctAnswer,
          imageUrl: q.imageUrl,
          referenceImage: q.referenceImage ?? null,
          points: q.points,
          negativeMarks: q.negativeMarks ?? 0,
          allowPartialMarking: q.allowPartialMarking ?? false,
          order: q.order !== 0 ? q.order : startOrder + i,
          difficulty: q.difficulty,
          partId: q.partId,
          sectionId: q.sectionId,
          groupId: q.groupId,
        })),
      });

      const existingQuestions = await tx.testQuestion.findMany({
        where: { testId },
        orderBy: { order: 'asc' },
      });
      const reorderedQuestions = reindexQuestionsBySection(existingQuestions);

      await Promise.all(
        reorderedQuestions.map((question) =>
          tx.testQuestion.update({
            where: { id: question.id },
            data: { order: question.order },
          })
        )
      );

      const allQuestions = await tx.testQuestion.findMany({
        where: { testId },
        orderBy: { order: 'asc' },
      });

      return { createdCount: created.count, allQuestions };
    });

    return apiCreated(
      { count: createdCount, questions: allQuestions },
      `${createdCount} question(s) added successfully`
    );
  } catch (err) {
    console.error('[ADD_TEST_QUESTIONS_ERROR]', err);
    return apiServerError();
  }
}
