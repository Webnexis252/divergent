import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CreateQuizSchema } from '@/lib/validators';
import { apiCreated, apiError, apiForbidden, apiServerError, apiSuccess } from '@/lib/api-response';

type Params = { params: Promise<{ lessonId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { lessonId } = await params;
    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    
    // Do not return correctAnswers to students unless they passed (could be handled in specialized routes)
    return apiSuccess(quiz);
  } catch (err) {
    console.error('[GET_QUIZ_ERROR]', err);
    return apiServerError();
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'MENTOR']);
    if (!user) return apiForbidden('Only admins and mentors can create quizzes');

    const { lessonId } = await params;
    
    const body = await req.json();
    const parsed = CreateQuizSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const { title, passingScore, questions } = parsed.data;

    const quiz = await prisma.quiz.create({
      data: {
        lessonId,
        title,
        passingScore,
        questions: {
          create: questions?.map((q: any, idx: number) => ({
            ...q,
            options: q.options ?? [],
            order: q.order ?? idx,
          })) || []
        }
      },
      include: { questions: true }
    });

    return apiCreated(quiz, 'Quiz created successfully');
  } catch (err) {
    console.error('[CREATE_QUIZ_ERROR]', err);
    return apiServerError();
  }
}
