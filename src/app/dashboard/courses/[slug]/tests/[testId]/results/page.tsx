import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { verifyTokenValue, AUTH_COOKIE_NAME } from "@/lib/auth";
import { gradeQuestionAnswer } from "@/lib/test-grading";
import { TestResultsClient, TestResultData, QuestionBreakdown } from "./TestResultsClient";

export default async function TestResultsPage({
  params,
}: {
  params: Promise<{ slug: string; testId: string }>;
}) {
  const { slug, testId } = await params;

  // 1. Authenticate user
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const user = await verifyTokenValue(token);

  if (!user) {
    redirect("/login");
  }

  // 2. Fetch course by slug
  const course = await prisma.course.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!course) {
    return <TestResultsClient data={null} slug={slug} testId={testId} courseId="" />;
  }

  // 3. Fetch test
  const test = await prisma.courseTest.findFirst({
    where: { id: testId, courseId: course.id },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      durationMins: true,
      passingScore: true,
      maxAttempts: true,
      showResults: true,
      _count: { select: { questions: true } },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          type: true,
          category: true,
          prompt: true,
          options: true,
          correctAnswer: true,
          explanation: true,
          points: true,
          order: true,
          difficulty: true,
        },
      },
    },
  });

  if (!test) {
    return <TestResultsClient data={null} slug={slug} testId={testId} courseId={course.id} />;
  }

  // 4. Fetch attempts
  const attempts = await prisma.testAttempt.findMany({
    where: { testId, userId: user.userId },
    orderBy: { createdAt: "desc" },
  });

  let data: TestResultData;

  if (attempts.length === 0) {
    data = {
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        type: test.type,
        durationMins: test.durationMins,
        totalQuestions: test._count.questions,
        passingScore: test.passingScore,
        maxAttempts: test.maxAttempts,
      },
      stats: {
        totalAttempts: 0,
        bestScore: 0,
        avgScore: 0,
        canRetake: true,
        attemptsRemaining: test.maxAttempts === -1 ? "unlimited" : test.maxAttempts,
      },
      attempts: [],
    };
  } else {
    // Build detailed results for each attempt
    const detailedAttempts = attempts.map((attempt) => {
      const answers = attempt.answers as Record<string, unknown>;
      const questionOrder = (attempt.questionOrder as string[]) || test.questions.map((q) => q.id);

      // Always build the grading breakdown so summary analytics stay accurate.
      let questionBreakdown = null;
      if (attempt.submittedAt) {
        const sketchGrades = (attempt.sketchGrades as Record<string, { points: number; feedback?: string }>) || {};
        questionBreakdown = questionOrder.reduce<QuestionBreakdown[]>((items, qId) => {
            const q = test.questions.find((tq) => tq.id === qId);
            if (!q) return items;
            const userAnswer = answers[q.id];
            const gradedResult = gradeQuestionAnswer(
              {
                type: q.type,
                points: q.points,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
              },
              userAnswer,
              { includeAnswerKey: test.showResults }
            );

            let isCorrect = gradedResult.isCorrect;
            let pointsAwarded = gradedResult.pointsAwarded;

            if (q.type === "SKETCH" && sketchGrades[q.id] !== undefined) {
              pointsAwarded = sketchGrades[q.id].points;
              isCorrect = pointsAwarded > 0;
            }

            items.push({
              id: q.id,
              prompt: q.prompt,
              type: q.type as string,
              category: q.category,
              options: q.options as string[],
              correctAnswer: gradedResult.correctAnswer,
              userAnswer,
              isCorrect,
              explanation: gradedResult.explanation ?? null,
              points: q.points,
              pointsAwarded,
              difficulty: q.difficulty,
            });
            return items;
          }, []);
      }

      return {
        id: attempt.id,
        score: attempt.score,
        pointsEarned: attempt.pointsEarned,
        totalPoints: attempt.totalPoints,
        isPassed: attempt.isPassed,
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
        timeSpentSecs: attempt.timeSpentSecs,
        questionBreakdown,
      };
    });

    const completedAttempts = detailedAttempts.filter((a) => a.submittedAt);
    const bestScore = completedAttempts.length > 0 ? Math.max(...completedAttempts.map((a) => a.score)) : 0;
    const avgScore =
      completedAttempts.length > 0
        ? Math.round(completedAttempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts.length)
        : 0;
    const canRetake = test.maxAttempts === -1 || completedAttempts.length < test.maxAttempts;

    data = {
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        type: test.type,
        durationMins: test.durationMins,
        totalQuestions: test._count.questions,
        passingScore: test.passingScore,
        maxAttempts: test.maxAttempts,
      },
      stats: {
        totalAttempts: completedAttempts.length,
        bestScore,
        avgScore,
        canRetake,
        attemptsRemaining: test.maxAttempts === -1 ? "unlimited" : test.maxAttempts - completedAttempts.length,
      },
      attempts: detailedAttempts,
    };
  }

  return <TestResultsClient data={data} slug={slug} testId={testId} courseId={course.id} />;
}
