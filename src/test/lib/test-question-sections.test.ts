import { describe, expect, it } from "vitest";
import { groupQuestionsBySection, reindexQuestionsBySection } from "@/lib/test-question-sections";

describe("test question sections", () => {
  it("reorders questions into fixed section order", () => {
    const questions = [
      { id: "1", type: "NUMERIC", order: 0 },
      { id: "2", type: "SCQ", order: 1 },
      { id: "3", type: "SKETCH", order: 2 },
      { id: "4", type: "MCQ", order: 3 },
    ];

    expect(reindexQuestionsBySection(questions)).toEqual([
      { id: "2", type: "SCQ", order: 0 },
      { id: "4", type: "MCQ", order: 1 },
      { id: "3", type: "SKETCH", order: 2 },
      { id: "1", type: "NUMERIC", order: 3 },
    ]);
  });

  it("groups questions by section label", () => {
    const sections = groupQuestionsBySection([
      { id: "1", type: "SCQ", order: 0 },
      { id: "2", type: "SCQ", order: 1 },
      { id: "3", type: "SKETCH", order: 2 },
    ]);

    expect(sections.map((section) => [section.type, section.questions.length])).toEqual([
      ["SCQ", 2],
      ["SKETCH", 1],
    ]);
  });
});
