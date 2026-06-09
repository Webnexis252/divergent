type TestQuestionForGrading = {
  type: string;
  points: number;
  negativeMarks?: number;
  allowPartialMarking?: boolean;
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
    const correctArr = toTrimmedStringArray(question.correctAnswer);
    const selectedArr = toTrimmedStringArray(studentAnswer);
    const isAttempted = selectedArr.length > 0;
    
    let isCorrect = false;
    let pointsAwarded = 0;

    if (isAttempted) {
      const correctSet = new Set(correctArr);
      const selectedSet = new Set(selectedArr);
      
      const hasIncorrectSelection = selectedArr.some(s => !correctSet.has(s));
      const hasAllCorrect = correctArr.every(c => selectedSet.has(c));
      
      if (!hasIncorrectSelection && hasAllCorrect && selectedArr.length === correctArr.length) {
        isCorrect = true;
        pointsAwarded = question.points;
      } else if (question.allowPartialMarking && !hasIncorrectSelection && selectedArr.length > 0) {
        isCorrect = false; // Partially correct
        pointsAwarded = (selectedArr.length / correctArr.length) * question.points;
      } else {
        isCorrect = false;
        pointsAwarded = -(question.negativeMarks ?? 0);
      }
    }

    return {
      ...baseResult,
      isCorrect,
      pointsAwarded,
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
