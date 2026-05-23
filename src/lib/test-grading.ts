type TestQuestionForGrading = {
  type: string;
  points: number;
  negativeMarks?: number;
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
    const isAttempted = given !== "";
    return {
      ...baseResult,
      isCorrect,
      pointsAwarded: isCorrect ? question.points : (isAttempted ? -(question.negativeMarks ?? 0) : 0),
    };
  }

  if (question.type === "MCQ") {
    const sortedCorrect = toTrimmedStringArray(question.correctAnswer).sort().join("|||");
    const sortedSelected = toTrimmedStringArray(studentAnswer).sort().join("|||");
    const isCorrect = sortedSelected !== "" && sortedSelected === sortedCorrect;
    const isAttempted = sortedSelected !== "";
    return {
      ...baseResult,
      isCorrect,
      pointsAwarded: isCorrect ? question.points : (isAttempted ? -(question.negativeMarks ?? 0) : 0),
    };
  }

  if (question.type === "NUMERIC") {
    const correctArr = toTrimmedStringArray(question.correctAnswer);
    const givenTrimmed = (typeof studentAnswer === "string" ? studentAnswer : "").trim();
    const isAttempted = givenTrimmed !== "";
    
    let isCorrect = false;
    if (isAttempted) {
      if (correctArr.length > 1) {
        // Range match
        const minNum = Number(correctArr[0]);
        const maxNum = Number(correctArr[1]);
        const givenNum = Number(givenTrimmed);
        if (!isNaN(givenNum) && !isNaN(minNum) && !isNaN(maxNum)) {
          isCorrect = givenNum >= minNum && givenNum <= maxNum;
        }
      } else {
        // Exact match
        const correct = (correctArr[0] ?? "").toLowerCase();
        isCorrect = givenTrimmed.toLowerCase() === correct;
      }
    }

    return {
      ...baseResult,
      isCorrect,
      pointsAwarded: isCorrect ? question.points : (isAttempted ? -(question.negativeMarks ?? 0) : 0),
    };
  }

  return baseResult;
}
