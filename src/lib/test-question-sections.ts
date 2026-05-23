/**
 * Question type section ordering, grouping, and Part A/B splitting.
 *
 * Part A: SCQ, MCQ, NUMERIC  (auto-graded, 2/3 of total time)
 * Part B: SKETCH             (manual grading, 1/3 of total time)
 */

export const QUESTION_TYPE_SECTION_ORDER = ["SCQ", "MCQ", "NUMERIC", "SKETCH"] as const;

export type QuestionTypeSectionKey = (typeof QUESTION_TYPE_SECTION_ORDER)[number];

export const QUESTION_TYPE_SECTION_LABELS: Record<QuestionTypeSectionKey, string> = {
  SCQ: "Single Choice",
  MCQ: "Multiple Choice",
  NUMERIC: "Numerical",
  SKETCH: "Sketching",
};

// ── Part A / B classification ──────────────────────────────────────────────────

/** Question types included in Part A (auto-graded, shown first). */
export const PART_A_TYPES: readonly QuestionTypeSectionKey[] = ["SCQ", "MCQ", "NUMERIC"];

/** Question types included in Part B (manually graded, shown second). */
export const PART_B_TYPES: readonly QuestionTypeSectionKey[] = ["SKETCH"];

/** Returns true if the question type belongs to Part A. */
export function isPartAType(type: string): boolean {
  return (PART_A_TYPES as readonly string[]).includes(type);
}

/** Returns true if the question type belongs to Part B. */
export function isPartBType(type: string): boolean {
  return (PART_B_TYPES as readonly string[]).includes(type);
}

// ── Category options (unchanged) ───────────────────────────────────────────────

export const QUESTION_CATEGORY_OPTIONS = [
  "VISUALIZATION",
  "OBSERVATION",
  "PROBLEM_SOLVING",
  "CREATIVITY",
  "COMMUNICATION",
  "TIME_MANAGEMENT",
  "AESTHETIC_SENSE",
  "CONCEPT",
] as const;

export const QUESTION_CATEGORY_LABELS: Record<(typeof QUESTION_CATEGORY_OPTIONS)[number], string> = {
  VISUALIZATION: "Visualization",
  OBSERVATION: "Observation",
  PROBLEM_SOLVING: "Problem-Solving",
  CREATIVITY: "Creativity",
  COMMUNICATION: "Communication",
  TIME_MANAGEMENT: "Time Management",
  AESTHETIC_SENSE: "Aesthetic Sense",
  CONCEPT: "Concept",
};

// ── Sorting & grouping helpers ─────────────────────────────────────────────────

type SectionQuestion = {
  type: string;
  order: number;
};

export function getQuestionTypeSectionRank(type: string) {
  const index = QUESTION_TYPE_SECTION_ORDER.indexOf(type as QuestionTypeSectionKey);
  return index === -1 ? QUESTION_TYPE_SECTION_ORDER.length : index;
}

export function sortQuestionsBySection<T extends SectionQuestion>(questions: T[]) {
  return [...questions].sort((a, b) => {
    const sectionDiff = getQuestionTypeSectionRank(a.type) - getQuestionTypeSectionRank(b.type);
    if (sectionDiff !== 0) return sectionDiff;
    return a.order - b.order;
  });
}

export function reindexQuestionsBySection<T extends SectionQuestion>(questions: T[]) {
  return sortQuestionsBySection(questions).map((question, index) => ({
    ...question,
    order: index,
  }));
}

export function groupQuestionsBySection<T extends SectionQuestion>(questions: T[]) {
  return QUESTION_TYPE_SECTION_ORDER.map((type) => ({
    type,
    label: QUESTION_TYPE_SECTION_LABELS[type],
    questions: questions.filter((question) => question.type === type),
  })).filter((section) => section.questions.length > 0);
}

// ── Part A / B splitting ───────────────────────────────────────────────────────

/**
 * Split questions into Part A (auto-graded) and Part B (sketch/manual).
 * Each part's questions are kept in their original order.
 */
export function splitQuestionsByPart<T extends { type: string }>(questions: T[]): {
  partA: T[];
  partB: T[];
} {
  return {
    partA: questions.filter((q) => isPartAType(q.type)),
    partB: questions.filter((q) => isPartBType(q.type)),
  };
}

/**
 * Calculate the time split for a two-part exam.
 * Part A gets 2/3 of the total time, Part B gets 1/3.
 * If there are no Part B questions, all time goes to Part A.
 */
export function getPartTimeSplit(
  totalDurationSecs: number,
  hasPartB: boolean
): { partASecs: number; partBSecs: number } {
  if (!hasPartB) {
    return { partASecs: totalDurationSecs, partBSecs: 0 };
  }
  const partASecs = Math.floor((totalDurationSecs * 2) / 3);
  const partBSecs = totalDurationSecs - partASecs;
  return { partASecs, partBSecs };
}
