import type { Prisma } from '@prisma/client';
import { gradeQuestionAnswer, type GradedQuestionAnswer } from '@/lib/test-grading';

/**
 * Shared rules for starting and submitting a test attempt, so the start and
 * submit routes can't disagree about which questions an attempt contains.
 */

/**
 * Serialises start and submit for one student and one test until the
 * transaction ends. Without it two parallel Start clicks create two attempts,
 * and two parallel submits both pass the `maxAttempts` check. A transaction-level
 * advisory lock is released on commit or rollback, so it is safe behind
 * PgBouncer's transaction pooling.
 */
export async function lockTestAttempts(tx: Prisma.TransactionClient, userId: string, testId: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${testId}))`;
}

type QuestionForOrdering = { id: string; type: string };

const TYPE_ORDER: Record<string, number> = { SCQ: 1, MCQ: 2, MULTIPLE_RESPONSE: 2, NUMERIC: 3, SKETCH: 4 };

/**
 * The questions a new attempt will show, in order. Tests built from parts show
 * every question in the part and section layout, so their attempts hold every
 * question. Flat tests are shuffled when configured, grouped by type, and cut
 * to `questionsToShow`.
 */
export function questionOrderForNewAttempt(
  test: { shuffleQuestions: boolean; questionsToShow: number | null; hasParts: boolean },
  questions: QuestionForOrdering[],
  random: () => number = Math.random,
): string[] {
  if (test.hasParts) return questions.map((q) => q.id);

  const pool = questions.slice();
  if (test.shuffleQuestions) {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }
  pool.sort((a, b) => (TYPE_ORDER[a.type] ?? 5) - (TYPE_ORDER[b.type] ?? 5));

  const ids = pool.map((q) => q.id);
  return test.questionsToShow && test.questionsToShow < ids.length ? ids.slice(0, test.questionsToShow) : ids;
}

/** The question ids saved on an attempt, or null when it has none (older attempts). */
export function attemptQuestionIds(questionOrder: Prisma.JsonValue | null | undefined): string[] | null {
  if (!Array.isArray(questionOrder)) return null;
  const ids = questionOrder.filter((id): id is string => typeof id === 'string');
  return ids.length > 0 ? ids : null;
}

type QuestionForScoring = Parameters<typeof gradeQuestionAnswer>[0] & { id: string };

export type ScoredSubmission = {
  score: number;
  pointsEarned: number;
  totalPoints: number;
  isPassed: boolean;
  gradingStatus: 'AUTO_GRADED' | 'PENDING_REVIEW';
  questionResults: Record<string, GradedQuestionAnswer>;
  /** The submitted answers for these questions only; anything else in the request is dropped. */
  answers: Record<string, unknown>;
};

/**
 * Grades the questions the attempt showed. SKETCH answers wait for a teacher,
 * so the score is over the auto-gradable points and the attempt can't pass yet.
 */
export function scoreSubmission(
  questions: QuestionForScoring[],
  submitted: Record<string, unknown>,
  { passingScore, showResults }: { passingScore: number; showResults: boolean },
): ScoredSubmission {
  let pointsEarned = 0;
  let totalPoints = 0;
  let sketchPoints = 0;
  let hasSketch = false;
  const questionResults: Record<string, GradedQuestionAnswer> = {};
  const answers: Record<string, unknown> = {};

  for (const q of questions) {
    totalPoints += q.points;
    if (q.type === 'SKETCH') {
      hasSketch = true;
      sketchPoints += q.points;
    }
    if (Object.prototype.hasOwnProperty.call(submitted, q.id)) answers[q.id] = submitted[q.id];

    const graded = gradeQuestionAnswer(q, submitted[q.id], { includeAnswerKey: showResults });
    pointsEarned += graded.pointsAwarded;
    questionResults[q.id] = graded;
  }

  const autoGradedMax = totalPoints - sketchPoints;
  const score = autoGradedMax > 0 ? Math.round((pointsEarned / autoGradedMax) * 100) : 0;

  return {
    score,
    pointsEarned,
    totalPoints,
    isPassed: !hasSketch && score >= passingScore,
    gradingStatus: hasSketch ? 'PENDING_REVIEW' : 'AUTO_GRADED',
    questionResults,
    answers,
  };
}
