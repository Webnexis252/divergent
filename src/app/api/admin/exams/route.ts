import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { reindexQuestionsBySection } from '@/lib/test-question-sections';
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiForbidden,
  apiServerError,
} from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN', 'MENTOR']);
    if (!user) return apiForbidden('Unauthorized');

    const body = await req.json();
    const { title, durationMins, courseId, questions, originalPdfUrl, availableFrom } = body;

    if (!title || !courseId || !questions || !Array.isArray(questions)) {
      return apiError('Missing required fields: title, courseId, and questions array', 400);
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        ...(user.role === 'MENTOR'
          ? {
              teachers: {
                select: { id: true },
              },
            }
          : {}),
      },
    });
    if (!course) return apiError('Course not found', 404);

    // Verify access
    if (user.role === 'MENTOR' && !course.teachers?.some((t) => t.id === user.userId)) {
      return apiForbidden('You can only create exams for your own courses');
    }

    const orderedQuestions = reindexQuestionsBySection(
      questions.map((q: any, i: number) => ({
        ...q,
        order: q.order ?? i,
      }))
    );

    const exam = await prisma.courseTest.create({
      data: {
        title,
        courseId,
        durationMins: durationMins || 60,
        type: 'COURSE_EXAM',
        status: 'PUBLISHED',
        shuffleQuestions: false,
        originalPdfUrl,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        questions: orderedQuestions.length
          ? {
              create: orderedQuestions.map((q: any, i: number) => ({
                prompt: q.prompt,
                options: q.options || [],
                correctAnswer: q.correctAnswer || [],
                type: q.type || 'SCQ',
                category: q.category || 'CONCEPT',
                referenceImage: q.referenceImage ?? null,
                imageUrl: q.imageUrl ?? null,
                points: q.points ?? 1,
                negativeMarks: q.negativeMarks ?? 0,
                difficulty: q.difficulty ?? 'MEDIUM',
                explanation: q.explanation ?? null,
                order: q.order ?? i,
              })),
            }
          : undefined,
      },
    });

    return apiCreated(exam, 'Exam created successfully');
  } catch (err) {
    console.error('[CREATE_EXAM_ERROR]', err);
    return apiServerError(
      process.env.NODE_ENV === 'development'
        ? err instanceof Error
          ? err.message
          : String(err)
        : undefined
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN', 'MENTOR']);
    if (!user) return apiForbidden('Unauthorized');

    const exams = await prisma.courseTest.findMany({
      where: user.role === 'MENTOR' ? { course: { teachers: { some: { id: user.userId } } } } : undefined,
      include: {
        course: { select: { title: true } },
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess({ exams });
  } catch (err) {
    console.error('[GET_EXAMS_ERROR]', err);
    return apiServerError();
  }
}
