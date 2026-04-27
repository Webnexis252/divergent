import {
  QUESTION_CATEGORY_LABELS,
  QUESTION_CATEGORY_OPTIONS,
} from "@/lib/test-question-sections";

export type QuestionCategoryKey = (typeof QUESTION_CATEGORY_OPTIONS)[number];

export type CategoryPerformanceEntry = {
  category?: string | null;
  points: number;
  pointsAwarded?: number | null;
  isCorrect?: boolean | null;
};

export type CategoryPerformanceItem = {
  category: QuestionCategoryKey;
  label: string;
  color: string;
  questionCount: number;
  totalPoints: number;
  earnedPoints: number;
  correctCount: number;
  pendingCount: number;
  score: number;
  share: number;
};

export const CATEGORY_PERFORMANCE_COLORS: Record<QuestionCategoryKey, string> = {
  VISUALIZATION: "#bfe3c2",
  OBSERVATION: "#ffc6b0",
  PROBLEM_SOLVING: "#bfe6f8",
  CREATIVITY: "#ffd89a",
  COMMUNICATION: "#c9c2ff",
  TIME_MANAGEMENT: "#ffe89c",
  AESTHETIC_SENSE: "#aee0f8",
  CONCEPT: "#ffd3a6",
};

type CategoryPerformanceOptions = {
  includeEmpty?: boolean;
};

export function normalizeQuestionCategory(category?: string | null): QuestionCategoryKey {
  return QUESTION_CATEGORY_OPTIONS.includes(category as QuestionCategoryKey)
    ? (category as QuestionCategoryKey)
    : "CONCEPT";
}

function getEarnedPoints(entry: CategoryPerformanceEntry) {
  if (typeof entry.pointsAwarded === "number") {
    return Math.min(entry.points, Math.max(0, entry.pointsAwarded));
  }

  return entry.isCorrect === true ? entry.points : 0;
}

function emptyCategoryPerformanceItem(category: QuestionCategoryKey) {
  return {
    category,
    label: QUESTION_CATEGORY_LABELS[category],
    color: CATEGORY_PERFORMANCE_COLORS[category],
    questionCount: 0,
    totalPoints: 0,
    earnedPoints: 0,
    correctCount: 0,
    pendingCount: 0,
  };
}

function finalizeCategoryPerformanceItems(
  totals: Map<QuestionCategoryKey, Omit<CategoryPerformanceItem, "score" | "share">>,
  options?: CategoryPerformanceOptions
) {
  const categories = options?.includeEmpty
    ? QUESTION_CATEGORY_OPTIONS
    : QUESTION_CATEGORY_OPTIONS.filter((category) => totals.has(category));

  return categories
    .map((category) => {
      const item = totals.get(category) ?? emptyCategoryPerformanceItem(category);
      return {
        ...item,
        score: item.totalPoints > 0 ? Math.round((item.earnedPoints / item.totalPoints) * 100) : 0,
        share: categories.length > 0 ? 1 / categories.length : 0,
      };
    })
    .filter((item) => options?.includeEmpty || item.questionCount > 0);
}

export function buildCategoryPerformanceBreakdown(
  entries: CategoryPerformanceEntry[],
  options?: CategoryPerformanceOptions
) {
  const totals = new Map<QuestionCategoryKey, Omit<CategoryPerformanceItem, "score" | "share">>();

  for (const entry of entries) {
    const category = normalizeQuestionCategory(entry.category);
    const current = totals.get(category) ?? emptyCategoryPerformanceItem(category);

    current.questionCount += 1;
    current.totalPoints += entry.points;
    current.earnedPoints += getEarnedPoints(entry);

    if (entry.isCorrect === true) current.correctCount += 1;
    if (entry.isCorrect === null) current.pendingCount += 1;

    totals.set(category, current);
  }

  return finalizeCategoryPerformanceItems(totals, options);
}

export function averageCategoryPerformanceBreakdown(
  attempts: CategoryPerformanceEntry[][],
  options?: CategoryPerformanceOptions
) {
  const totals = new Map<
    QuestionCategoryKey,
    Omit<CategoryPerformanceItem, "score" | "share"> & { scoreSum: number; testCount: number }
  >();

  for (const attemptEntries of attempts) {
    const attemptBreakdown = buildCategoryPerformanceBreakdown(attemptEntries);

    for (const item of attemptBreakdown) {
      const current = totals.get(item.category) ?? {
        ...emptyCategoryPerformanceItem(item.category),
        scoreSum: 0,
        testCount: 0,
      };

      current.questionCount += item.questionCount;
      current.totalPoints += item.totalPoints;
      current.earnedPoints += item.earnedPoints;
      current.correctCount += item.correctCount;
      current.pendingCount += item.pendingCount;
      current.scoreSum += item.score;
      current.testCount += 1;

      totals.set(item.category, current);
    }
  }

  const categories = options?.includeEmpty
    ? QUESTION_CATEGORY_OPTIONS
    : QUESTION_CATEGORY_OPTIONS.filter((category) => totals.has(category));

  return categories
    .map((category) => {
      const item = totals.get(category) ?? {
        ...emptyCategoryPerformanceItem(category),
        scoreSum: 0,
        testCount: 0,
      };

      return {
        category,
        label: QUESTION_CATEGORY_LABELS[category],
        color: CATEGORY_PERFORMANCE_COLORS[category],
        questionCount: item.questionCount,
        totalPoints: item.totalPoints,
        earnedPoints: item.earnedPoints,
        correctCount: item.correctCount,
        pendingCount: item.pendingCount,
        score: item.testCount > 0 ? Math.round(item.scoreSum / item.testCount) : 0,
        share: categories.length > 0 ? 1 / categories.length : 0,
      };
    })
    .filter((item) => options?.includeEmpty || item.questionCount > 0);
}
