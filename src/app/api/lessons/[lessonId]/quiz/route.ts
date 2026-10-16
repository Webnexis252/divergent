import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canManageCourse, courseRelation } from '@/lib/course-access';
import { CreateQuizSchema } from '@/lib/validators';
import {
  apiCreated,
  apiError,
  apiForbidden,
  apiNotFound,
  apiServerError,
  apiSuccess,
  apiUnauthorized,
} from '@/lib/api-response';

type Params = { params: Promise<{ lessonId: string }> };

async function courseIdOfLesson(lessonId: string): Promise<string | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { chapter: { select: { courseId: true } } },
  });
  return lesson?.chapter.courseId ?? null;
}

/**
 * GET /api/lessons/[lessonId]/quiz
 * The lesson's quiz for enrolled students and the course's teachers. Students
 * get the questions without their answers; /api/quizzes/[quizId]/attempt
 * grades on the server.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const { lessonId } = await params;
    const courseId = await courseIdOfLesson(lessonId);
    if (!courseId) return apiNotFound('Lesson');

    const relation = await courseRelation(user, courseId);
    if (relation === 'none') return apiForbidden('Enroll in this course to see its quizzes');

    const quiz = await prisma.quiz.findUnique({
      where: { lessonId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!quiz || relation === 'manager') return apiSuccess(quiz);

    return apiSuccess({
      ...quiz,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        quizId: q.quizId,
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        imageUrl: q.imageUrl,
        order: q.order,
      })),
    });
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
    const courseId = await courseIdOfLesson(lessonId);
    if (!courseId) return apiNotFound('Lesson');
    if (!(await canManageCourse(user, courseId))) {
      return apiForbidden('You can only add quizzes to courses you teach');
    }

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
