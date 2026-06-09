import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { reindexQuestionsBySection } from '@/lib/test-question-sections';
import { QuestionType, QuestionCategory } from '@prisma/client';
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiForbidden,
  apiServerError,
} from '@/lib/api-response';

interface RawQuestion {
  prompt: string;
  options?: string[];
  correctAnswer?: string[];
  type?: string;
  category?: string;
  referenceImage?: string | null;
  imageUrl?: string | null;
  points?: number;
  negativeMarks?: number;
  difficulty?: string;
  explanation?: string | null;
  order?: number;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN', 'MENTOR']);
    if (!user) return apiForbidden('Unauthorized');

    const body = await req.json();
    const { title, durationMins, courseId, originalPdfUrl, availableFrom } = body;

    if (!title || !courseId) {
      return apiError('Missing required fields: title, courseId', 400);
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
        parts: {
          create: [{
            title: "Part 1",
            order: 0,
            durationMins: durationMins || 60,
            sections: {
              create: [{
                title: "Section 1",
                questionType: "SCQ",
                order: 0
              }]
            }
          }]
        }
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
