import { describe, expect, it } from "vitest";
import { buildTestReports, flagInfo, parseAnswerCounts, type StatRow, type TestWithStats } from "@/lib/question-stats";

function stat(questionId: string, overrides: Partial<StatRow> = {}): StatRow {
  return {
    questionId,
    studentCount: 30,
    answeredCount: 28,
    correctCount: 20,
    pendingCount: 0,
    difficulty: 0.7,
    discrimination: 0.4,
    answerCounts: [],
    flags: [],
    computedAt: new Date("2026-10-20T20:30:00Z"),
    ...overrides,
  };
}

function test_(stats: StatRow[]): TestWithStats {
  return {
    id: "t1",
    title: "Unit test",
    questions: ["q1", "q2", "q3", "q4"].map((id) => ({ id, prompt: `Prompt ${id}`, type: "SCQ", imageUrl: null })),
    questionStats: stats,
  };
}

describe("buildTestReports", () => {
  it("numbers questions by their place in the test and puts the most serious flags first", () => {
    const [report] = buildTestReports([
      test_([
        stat("q1"),
        stat("q2", { flags: ["TOO_EASY"] }),
        stat("q3", { flags: ["TOO_HARD", "NEGATIVE_DISCRIMINATION"] }),
        stat("q4", { flags: ["OFTEN_SKIPPED"] }),
      ]),
    ]);
    expect(report.questions.map((q) => q.number)).toEqual([3, 4, 2, 1]);
    expect(report.questions[0].flags.map((f) => f.code)).toEqual(["NEGATIVE_DISCRIMINATION", "TOO_HARD"]);
    expect(report.flaggedCount).toBe(3);
  });

  it("reports the latest run time and the largest class size", () => {
    const [report] = buildTestReports([
      test_([
        stat("q1", { studentCount: 12, computedAt: new Date("2026-10-19T20:30:00Z") }),
        stat("q2", { studentCount: 30 }),
      ]),
    ]);
    expect(report.computedAt).toBe("2026-10-20T20:30:00.000Z");
    expect(report.studentCount).toBe(30);
  });

  it("skips tests without stats and stats for questions no longer in the test", () => {
    expect(buildTestReports([test_([])])).toEqual([]);
    const [report] = buildTestReports([test_([stat("q1"), stat("deleted")])]);
    expect(report.questions.map((q) => q.questionId)).toEqual(["q1"]);
  });
});

describe("parseAnswerCounts", () => {
  it("keeps well-formed rows and drops the rest", () => {
    expect(
      parseAnswerCounts([
        { answer: "A", count: 3, isCorrect: true },
        { answer: null, count: 2, isCorrect: false },
        { answer: 5, count: 1, isCorrect: false },
        { answer: "B" },
        null,
      ]),
    ).toEqual([
      { answer: "A", count: 3, isCorrect: true },
      { answer: null, count: 2, isCorrect: false },
    ]);
    expect(parseAnswerCounts({ not: "a list" })).toEqual([]);
  });
});

describe("flagInfo", () => {
  it("labels known flags and passes unknown ones through", () => {
    expect(flagInfo("TOP_STUDENTS_DISAGREE").severity).toBe(3);
    expect(flagInfo("SOMETHING_NEW")).toEqual({ code: "SOMETHING_NEW", label: "SOMETHING_NEW", advice: "", severity: 1 });
  });
});
