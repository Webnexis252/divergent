export const QUESTION_TYPE_SECTION_ORDER = ["SCQ", "MCQ", "SKETCH", "NUMERIC"] as const;

export const QUESTION_TYPE_SECTION_LABELS: Record<(typeof QUESTION_TYPE_SECTION_ORDER)[number], string> = {
  SCQ: "Single Choice",
  MCQ: "Multiple Choice",
  SKETCH: "Sketching",
  NUMERIC: "Numerical",
};

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

type SectionQuestion = {
  type: string;
  order: number;
};

export function getQuestionTypeSectionRank(type: string) {
  const index = QUESTION_TYPE_SECTION_ORDER.indexOf(type as (typeof QUESTION_TYPE_SECTION_ORDER)[number]);
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
