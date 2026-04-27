import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { SubmitQuizSchema } from '@/lib/validators';
import { apiCreated, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-response';

type Params = { params: Promise<{ quizId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['STUDENT']);
    if (!user) return apiUnauthorized('Only students can submit quiz attempts');

    const { quizId } = await params;
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });
    
    if (!quiz) return apiNotFound('Quiz');

    const body = await req.json();
    const parsed = SubmitQuizSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const userAnswers = parsed.data.answers;
    
    // Simple Auto-Grader (MCQ / TRUE_FALSE logic)
    let correctCount = 0;
    const totalQuestions = quiz.questions.length;

    quiz.questions.forEach((q) => {
      // In production, robust JSON deep equality checking is needed here
      const uAnswer = userAnswers[q.id];
      const correctAnswer = q.correctAnswer;
      // Very naive check for prototype purposes
      if (JSON.stringify(uAnswer) === JSON.stringify(correctAnswer)) {
        correctCount++;
      }
    });

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const isPassed = score >= quiz.passingScore;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId: user.userId,
        score,
        isPassed,
        answers: userAnswers,
      }
    });

    // Award XP if passed (Gamification link)
    if (isPassed) {
       await prisma.user.update({
         where: { id: user.userId },
         data: { xpPoints: { increment: 50 } } // Base XP for passing
       });
    }

    return apiCreated({ attempt, message: isPassed ? 'Quiz passed!' : 'Keep trying!'});
  } catch (err) {
    console.error('[SUBMIT_QUIZ_ERROR]', err);
    return apiServerError();
  }
}
