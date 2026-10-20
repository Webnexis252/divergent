/**
 * Exam question analysis for teachers. The numbers come from the QuestionStat
 * table, which the Python job in services/question-analytics fills every
 * night; this file only labels and orders them for the teacher page.
 */

export type QuestionFlagCode =
  | 'NEGATIVE_DISCRIMINATION'
  | 'TOP_STUDENTS_DISAGREE'
  | 'OPTIONS_CHANGED'
  | 'TOO_HARD'
  | 'OFTEN_SKIPPED'
  | 'LOW_DISCRIMINATION'
  | 'TOO_EASY';

export type QuestionFlag = {
  code: string;
  label: string;
  advice: string;
  /** 3: probably a mistake in the question, 2: worth a look, 1: for information */
  severity: 1 | 2 | 3;
};

/** Flag names match the constants in services/question-analytics/question_analytics/analysis.py. */
export const QUESTION_FLAGS: Record<QuestionFlagCode, Omit<QuestionFlag, 'code'>> = {
  NEGATIVE_DISCRIMINATION: {
    label: 'Weaker students do better',
    advice:
      'Students who did worse on the rest of the test got this right more often than the strongest students. Check the answer key and the wording.',
    severity: 3,
  },
  TOP_STUDENTS_DISAGREE: {
    label: 'Top students chose another answer',
    advice:
      "The strongest students' most common answer isn't the key. Check the answer key, or whether that answer is also defensible.",
    severity: 3,
  },
  OPTIONS_CHANGED: {
    label: "Answers don't match the options",
    advice:
      'Many answers match none of the current options, so the question was probably edited after students took the test. These numbers may be off.',
    severity: 2,
  },
  TOO_HARD: {
    label: 'Very hard',
    advice: 'Students got less than a quarter of the marks on average. Check that it was taught and that the key is right.',
    severity: 2,
  },
  OFTEN_SKIPPED: {
    label: 'Often skipped',
    advice: 'More than 30% of students left it blank. It may be unclear, too long, or placed too late in the test.',
    severity: 2,
  },
  LOW_DISCRIMINATION: {
    label: "Doesn't separate students",
    advice: 'Strong and weak students did about equally well on it, so it says little about who understands the topic.',
    severity: 1,
  },
  TOO_EASY: {
    label: 'Very easy',
    advice: "Almost every student got it right. Fine as a warm-up, but it doesn't test much.",
    severity: 1,
  },
};

export function flagInfo(code: string): QuestionFlag {
  const known = QUESTION_FLAGS[code as QuestionFlagCode];
  // A flag added to the job before the app learns about it still shows up
  return known ? { code, ...known } : { code, label: code, advice: '', severity: 1 };
}

export type AnswerCount = {
  /** null: answers that match none of the question's current options */
  answer: string | null;
  count: number;
  isCorrect: boolean;
};

/** answerCounts is JSON written by another program, so read it defensively. */
export function parseAnswerCounts(value: unknown): AnswerCount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const { answer, count, isCorrect } = row as Record<string, unknown>;
    if (typeof count !== 'number' || (answer !== null && typeof answer !== 'string')) return [];
    return [{ answer, count, isCorrect: isCorrect === true }];
  });
}

export type StatRow = {
  questionId: string;
  studentCount: number;
  answeredCount: number;
  correctCount: number;
  pendingCount: number;
  difficulty: number | null;
  discrimination: number | null;
  answerCounts: unknown;
  flags: string[];
  computedAt: Date;
};

export type TestWithStats = {
  id: string;
  title: string;
  questions: { id: string; prompt: string; type: string; imageUrl: string | null }[];
  questionStats: StatRow[];
};

export type QuestionReport = Omit<StatRow, 'answerCounts' | 'flags' | 'computedAt'> & {
  /** Position in the test, from 1 */
  number: number;
  prompt: string;
  type: string;
  imageUrl: string | null;
  answerCounts: AnswerCount[];
  flags: QuestionFlag[];
};

export type TestReport = {
  testId: string;
  title: string;
  /** Most students any question was shown to */
  studentCount: number;
  flaggedCount: number;
  computedAt: string;
  questions: QuestionReport[];
};

const topSeverity = (q: QuestionReport) => Math.max(0, ...q.flags.map((f) => f.severity));

/**
 * One report per test that has stats. `questions` must be in test order (it
 * numbers them). Within a test, questions with the most serious flags come
 * first, then the rest in test order.
 */
export function buildTestReports(tests: TestWithStats[]): TestReport[] {
  return tests
    .filter((test) => test.questionStats.length > 0)
    .map((test) => {
      const position = new Map(test.questions.map((q, i) => [q.id, { ...q, number: i + 1 }]));
      const questions = test.questionStats
        .flatMap((stat): QuestionReport[] => {
          const question = position.get(stat.questionId);
          if (!question) return [];
          return [
            {
              questionId: stat.questionId,
              number: question.number,
              prompt: question.prompt,
              type: question.type,
              imageUrl: question.imageUrl,
              studentCount: stat.studentCount,
              answeredCount: stat.answeredCount,
              correctCount: stat.correctCount,
              pendingCount: stat.pendingCount,
              difficulty: stat.difficulty,
              discrimination: stat.discrimination,
              answerCounts: parseAnswerCounts(stat.answerCounts),
              flags: stat.flags.map(flagInfo).sort((a, b) => b.severity - a.severity),
            },
          ];
        })
        .sort((a, b) => topSeverity(b) - topSeverity(a) || a.number - b.number);
      const computedAt = test.questionStats.reduce(
        (latest, s) => (s.computedAt > latest ? s.computedAt : latest),
        test.questionStats[0].computedAt,
      );
      return {
        testId: test.id,
        title: test.title,
        studentCount: Math.max(0, ...questions.map((q) => q.studentCount)),
        flaggedCount: questions.filter((q) => q.flags.length > 0).length,
        computedAt: computedAt.toISOString(),
        questions,
      };
    });
}
