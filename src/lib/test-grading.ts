type TestQuestionForGrading = {
  type: string;
  points: number;
  correctAnswer: unknown;
  explanation?: string | null;
};

type GradeQuestionAnswerOptions = {
  includeAnswerKey?: boolean;
};

export type GradedQuestionAnswer = {
  type: string;
  isCorrect: boolean | null;
  pointsAwarded: number;
  correctAnswer?: unknown;
  explanation?: string | null;
};

function toTrimmedStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item ?? "")))
      .map((item) => item.trim())
      .filter((item) => item !== "");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  return [];
}

function shouldIncludeAnswerKey(options?: GradeQuestionAnswerOptions) {
  return options?.includeAnswerKey ?? false;
}

export function gradeQuestionAnswer(
  question: TestQuestionForGrading,
  studentAnswer: unknown,
  options?: GradeQuestionAnswerOptions
): GradedQuestionAnswer {
  const includeAnswerKey = shouldIncludeAnswerKey(options);
  const baseResult: GradedQuestionAnswer = {
    type: question.type,
    isCorrect: false,
    pointsAwarded: 0,
    correctAnswer: includeAnswerKey ? question.correctAnswer : undefined,
    explanation: includeAnswerKey ? question.explanation ?? null : null,
  };

  if (question.type === "SKETCH") {
    return {
      type: question.type,
      isCorrect: null,
      pointsAwarded: 0,
      explanation: includeAnswerKey ? question.explanation ?? null : null,
    };
  }

  if (question.type === "SCQ") {
    const correct = toTrimmedStringArray(question.correctAnswer)[0] ?? "";
    const given = typeof studentAnswer === "string" ? studentAnswer.trim() : "";
    const isCorrect = given !== "" && given === correct;
    return {
      ...baseResult,
      isCorrect,
      pointsAwarded: isCorrect ? question.points : 0,
    };
  }

  if (question.type === "MCQ") {
    const sortedCorrect = toTrimmedStringArray(question.correctAnswer).sort().join("|||");
    const sortedSelected = toTrimmedStringArray(studentAnswer).sort().join("|||");
    const isCorrect = sortedSelected !== "" && sortedSelected === sortedCorrect;
    return {
      ...baseResult,
      isCorrect,
      pointsAwarded: isCorrect ? question.points : 0,
    };
  }

  if (question.type === "NUMERIC") {
    const correct = (toTrimmedStringArray(question.correctAnswer)[0] ?? "").toLowerCase();
    const given = (typeof studentAnswer === "string" ? studentAnswer : "").trim().toLowerCase();
    const isCorrect = given !== "" && given === correct;
    return {
      ...baseResult,
      isCorrect,
      pointsAwarded: isCorrect ? question.points : 0,
    };
  }

  return baseResult;
}
