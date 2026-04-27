import { describe, expect, it } from "vitest";
import {
  averageCategoryPerformanceBreakdown,
  buildCategoryPerformanceBreakdown,
  normalizeQuestionCategory,
} from "@/lib/test-category-performance";

describe("test category performance", () => {
  it("normalizes missing categories to concept", () => {
    expect(normalizeQuestionCategory(null)).toBe("CONCEPT");
    expect(normalizeQuestionCategory("UNKNOWN")).toBe("CONCEPT");
  });

  it("aggregates points, correctness, and pending counts by category", () => {
    const breakdown = buildCategoryPerformanceBreakdown([
      {
        category: "VISUALIZATION",
        points: 5,
        pointsAwarded: 5,
        isCorrect: true,
      },
      {
        category: "VISUALIZATION",
        points: 3,
        pointsAwarded: 0,
        isCorrect: false,
      },
      {
        category: "CREATIVITY",
        points: 4,
        pointsAwarded: 0,
        isCorrect: null,
      },
      {
        category: null,
        points: 2,
        pointsAwarded: 2,
        isCorrect: true,
      },
    ]);

    expect(breakdown.map((item) => item.category)).toEqual([
      "VISUALIZATION",
      "CREATIVITY",
      "CONCEPT",
    ]);
    expect(breakdown[0]).toMatchObject({
      questionCount: 2,
      totalPoints: 8,
      earnedPoints: 5,
      correctCount: 1,
      pendingCount: 0,
      score: 63,
    });
    expect(breakdown[1]).toMatchObject({
      totalPoints: 4,
      pendingCount: 1,
      score: 0,
    });
    expect(breakdown[2]).toMatchObject({
      totalPoints: 2,
      earnedPoints: 2,
      score: 100,
    });
    expect(
      breakdown.reduce((sum, item) => sum + item.share, 0)
    ).toBeCloseTo(1, 6);
  });

  it("averages category scores across multiple attempts", () => {
    const breakdown = averageCategoryPerformanceBreakdown(
      [
        [
          { category: "VISUALIZATION", points: 5, pointsAwarded: 5, isCorrect: true },
          { category: "OBSERVATION", points: 4, pointsAwarded: 2, isCorrect: false },
        ],
        [
          { category: "VISUALIZATION", points: 5, pointsAwarded: 3, isCorrect: false },
          { category: "OBSERVATION", points: 4, pointsAwarded: 4, isCorrect: true },
        ],
      ],
      { includeEmpty: true }
    );

    expect(breakdown.find((item) => item.category === "VISUALIZATION")?.score).toBe(80);
    expect(breakdown.find((item) => item.category === "OBSERVATION")?.score).toBe(75);
    expect(breakdown.find((item) => item.category === "CONCEPT")?.score).toBe(0);
    expect(breakdown).toHaveLength(8);
  });
});
