// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { gradeQuestionAnswer } from "@/lib/test-grading";

/**
 * The Python question-analytics job re-grades answers with its own port of
 * gradeQuestionAnswer. Both run these shared cases (the Python side in
 * services/question-analytics/tests/test_grading.py), so a grading change that
 * isn't made in both places fails one of the two test suites.
 */
type GradingCase = {
  name: string;
  question: Parameters<typeof gradeQuestionAnswer>[0];
  answer: unknown;
  expected: { isCorrect: boolean | null; pointsAwarded: number };
};

const fixture = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../../services/question-analytics/tests/fixtures/grading_cases.json"), "utf8"),
) as { cases: GradingCase[] };

describe("grading parity with the Python analytics job", () => {
  it.each(fixture.cases.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    const result = gradeQuestionAnswer(c.question, c.answer);
    expect(result.isCorrect).toBe(c.expected.isCorrect);
    // + 0 turns JavaScript's -0 (from -(negativeMarks ?? 0)) into 0
    expect(result.pointsAwarded + 0).toBeCloseTo(c.expected.pointsAwarded, 10);
  });
});
