import { describe, expect, it } from "vitest";
import { gradeQuestionAnswer } from "@/lib/test-grading";

describe("gradeQuestionAnswer", () => {
  it("grades single choice answers with trimmed exact matching", () => {
    const result = gradeQuestionAnswer(
      {
        type: "SCQ",
        points: 4,
        correctAnswer: ["B"],
      },
      "B "
    );

    expect(result.isCorrect).toBe(true);
    expect(result.pointsAwarded).toBe(4);
  });

  it("grades multiple choice answers as an exact set", () => {
    const result = gradeQuestionAnswer(
      {
        type: "MCQ",
        points: 5,
        correctAnswer: ["A", "C"],
      },
      ["C", "A"]
    );

    expect(result.isCorrect).toBe(true);
    expect(result.pointsAwarded).toBe(5);
  });

  it("grades numeric answers case-insensitively after trimming", () => {
    const result = gradeQuestionAnswer(
      {
        type: "NUMERIC",
        points: 3,
        correctAnswer: ["12E3"],
      },
      " 12e3 "
    );

    expect(result.isCorrect).toBe(true);
    expect(result.pointsAwarded).toBe(3);
  });

  it("marks sketch answers as pending review", () => {
    const result = gradeQuestionAnswer(
      {
        type: "SKETCH",
        points: 10,
        correctAnswer: [],
      },
      "data:image/png;base64,abc"
    );

    expect(result.isCorrect).toBeNull();
    expect(result.pointsAwarded).toBe(0);
  });
});
