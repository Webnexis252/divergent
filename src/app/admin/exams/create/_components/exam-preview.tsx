"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User as UserIcon, CheckCircle2, AlertTriangle, X } from "lucide-react";
import {
  QuestionCard,
  type QuestionData,
  type QuestionWatermark,
} from "@/app/dashboard/_components/test-taking/question-card";
import { SectionNavigator, type SectionTab } from "@/app/dashboard/_components/test-taking/section-navigator";
import {
  groupQuestionsBySection,
  splitQuestionsByPart,
  getPartTimeSplit,
  isPartAType,
  QUESTION_TYPE_SECTION_LABELS,
  type QuestionTypeSectionKey,
} from "@/lib/test-question-sections";

type QuestionStatus =
  | "NOT_VISITED"
  | "NOT_ANSWERED"
  | "ANSWERED"
  | "MARKED_FOR_REVIEW"
  | "ANSWERED_AND_MARKED";

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function isAnswered(answer: unknown, type: string): boolean {
  if (type === "MCQ") return Array.isArray(answer) && (answer as unknown[]).length > 0;
  if (type === "SKETCH") return typeof answer === "string" && answer.startsWith("data:");
  return typeof answer === "string" && answer.trim() !== "";
}

const statusColor: Record<QuestionStatus, string> = {
  NOT_VISITED: "bg-white border-gray-300 text-gray-700",
  NOT_ANSWERED: "bg-red-500 border-red-500 text-white",
  ANSWERED: "bg-green-500 border-green-500 text-white",
  MARKED_FOR_REVIEW: "bg-[#38bdf8] border-[#38bdf8] text-white",
  ANSWERED_AND_MARKED: "bg-[#facc15] border-[#facc15] text-white",
};

export function ExamPreview({
  exam,
  questions,
  onClose,
}: {
  exam: { title: string; durationMins: number };
  questions: QuestionData[];
  onClose: () => void;
}) {
  const { partA: partAQuestions, partB: partBQuestions } = useMemo(
    () => splitQuestionsByPart(questions),
    [questions]
  );
  const hasPartB = partBQuestions.length > 0;
  const totalDurationSecs = exam.durationMins * 60;
  const { partASecs, partBSecs } = useMemo(
    () => getPartTimeSplit(totalDurationSecs, hasPartB),
    [totalDurationSecs, hasPartB]
  );

  const [currentPart, setCurrentPart] = useState<"A" | "B">("A");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [statuses, setStatuses] = useState<Record<number, QuestionStatus>>(() => {
    const init: Record<number, QuestionStatus> = { 0: "NOT_ANSWERED" };
    questions.forEach((_, i) => { if (i !== 0) init[i] = "NOT_VISITED"; });
    return init;
  });
  
  const partALocked = false;

  const currentPartQuestions = currentPart === "A" ? partAQuestions : partBQuestions;
  const currentPartSections = useMemo(
    () => groupQuestionsBySection(
      currentPartQuestions.map((q) => ({
        ...q,
        order: questions.indexOf(q),
      }))
    ),
    [currentPartQuestions, questions]
  );

  const [activeSectionType, setActiveSectionType] = useState<string>(
    currentPartSections[0]?.type ?? (questions[0]?.type || "SCQ")
  );

  const activeSectionQuestions = useMemo(() => {
    const section = currentPartSections.find((s) => s.type === activeSectionType);
    return section?.questions ?? [];
  }, [currentPartSections, activeSectionType]);

  const globalIndex = useMemo(() => {
    if (activeSectionQuestions.length === 0) return 0;
    const q = activeSectionQuestions[Math.min(currentIndex, activeSectionQuestions.length - 1)];
    return questions.indexOf(q as QuestionData);
  }, [activeSectionQuestions, currentIndex, questions]);

  const handleAnswer = (questionId: string, answer: unknown) => {
    const idx = questions.findIndex((q) => q.id === questionId);
    if (idx === -1) return;
    setAnswers((prev) => ({ ...prev, [idx]: answer }));
  };

  const navigateToGlobal = (globalIdx: number) => {
    const q = questions[globalIdx];
    if (!q) return;
    setStatuses((prev) => {
      if (prev[globalIdx] === "NOT_VISITED" || prev[globalIdx] === undefined) {
        return { ...prev, [globalIdx]: "NOT_ANSWERED" };
      }
      return prev;
    });
    const sectionQs = activeSectionQuestions;
    const localIdx = sectionQs.findIndex((sq) => questions.indexOf(sq as QuestionData) === globalIdx);
    if (localIdx >= 0) {
      setCurrentIndex(localIdx);
    } else {
      setActiveSectionType(q.type);
      setCurrentIndex(0);
      const newSectionQs = currentPartSections.find((s) => s.type === q.type)?.questions ?? [];
      const newLocalIdx = newSectionQs.findIndex((sq) => questions.indexOf(sq as QuestionData) === globalIdx);
      if (newLocalIdx >= 0) setCurrentIndex(newLocalIdx);
    }
  };

  const handleSaveAndNext = () => {
    const q = questions[globalIndex];
    if (!q) return;
    const answered = isAnswered(answers[globalIndex], q.type);
    setStatuses((prev) => ({ ...prev, [globalIndex]: answered ? "ANSWERED" : "NOT_ANSWERED" }));

    if (currentIndex < activeSectionQuestions.length - 1) {
      const nextGlobalIdx = questions.indexOf(activeSectionQuestions[currentIndex + 1] as QuestionData);
      setStatuses((prev) => ({
        ...prev,
        [nextGlobalIdx]: prev[nextGlobalIdx] === "NOT_VISITED" ? "NOT_ANSWERED" : prev[nextGlobalIdx],
      }));
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleMarkReview = () => {
    const q = questions[globalIndex];
    if (!q) return;
    const answered = isAnswered(answers[globalIndex], q.type);
    setStatuses((prev) => ({
      ...prev,
      [globalIndex]: answered ? "ANSWERED_AND_MARKED" : "MARKED_FOR_REVIEW",
    }));
    if (currentIndex < activeSectionQuestions.length - 1) {
      const nextGlobalIdx = questions.indexOf(activeSectionQuestions[currentIndex + 1] as QuestionData);
      setStatuses((prev) => ({
        ...prev,
        [nextGlobalIdx]: prev[nextGlobalIdx] === "NOT_VISITED" ? "NOT_ANSWERED" : prev[nextGlobalIdx],
      }));
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleClear = () => {
    setAnswers((prev) => { const n = { ...prev }; delete n[globalIndex]; return n; });
    setStatuses((prev) => ({ ...prev, [globalIndex]: "NOT_ANSWERED" }));
  };

  const sectionTabs: SectionTab[] = useMemo(() => {
    return currentPartSections.map((section) => ({
      type: section.type,
      label: QUESTION_TYPE_SECTION_LABELS[section.type as QuestionTypeSectionKey] ?? section.type,
      count: section.questions.length,
      answeredCount: section.questions.filter((q) => {
        const gIdx = questions.indexOf(q as QuestionData);
        return isAnswered(answers[gIdx], q.type);
      }).length,
      locked: partALocked && isPartAType(section.type),
    }));
  }, [currentPartSections, questions, answers, partALocked]);

  const stats = { NOT_VISITED: 0, NOT_ANSWERED: 0, ANSWERED: 0, MARKED_FOR_REVIEW: 0, ANSWERED_AND_MARKED: 0 };
  Object.values(statuses).forEach((s) => {
      if (stats[s] !== undefined) stats[s]++;
  });

  const currentQ = questions[globalIndex];
  const watermark: QuestionWatermark = { name: "Admin Preview", email: "admin@example.com", phone: "" };

  const timeLeft = currentPart === "A" ? partASecs : partBSecs;
  const urgentTime = false;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-gray-50/95 backdrop-blur-md overflow-hidden"
    >
      <div className="absolute inset-0 flex flex-col bg-[#f5f6f8] font-sans">
        {/* ── Top Header ── */}
        <header className="flex h-16 shrink-0 items-center bg-white shadow-sm">
          <div className="flex w-[240px] shrink-0 items-center gap-2 px-6">
            <div className="grid grid-cols-2 gap-1">
              <div className="h-2 w-2 rounded-full bg-[#38bdf8]" />
              <div className="h-2 w-2 rounded-full bg-[#facc15]" />
              <div className="h-2 w-2 rounded-full bg-[#38bdf8]" />
              <div className="h-2 w-2 rounded-full bg-[#facc15]" />
            </div>
            <span className="font-bold leading-tight text-[#374151]">
              Divergent <br /> Classes
            </span>
          </div>
          <div className="flex h-full flex-1 items-center justify-between bg-[#38bdf8] px-8 text-white">
            <div>
              <h1 className="text-[20px] font-bold tracking-wide uppercase">{exam.title || "Untitled Exam"} (PREVIEW)</h1>
              <div className="flex items-center gap-3 text-[12px] text-white/80">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  currentPart === "A" ? "bg-white/20" : "bg-amber-400/30"
                }`}>
                  Part {currentPart}
                </span>
                {hasPartB && (
                  <span>Part A: SCQ + MCQ + Numeric</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium">Preview Mode</span>
                  <span className={`text-[12px] text-white/90`}>
                    Time left:{" "}
                    <span className={`font-bold text-[#facc15]`}>
                      {formatTime(timeLeft)}
                    </span>
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="ml-4 flex items-center justify-center rounded-full bg-white/20 p-2 hover:bg-white/30 transition text-white"
                title="Close Preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Left Sidebar ── */}
          <aside className="flex w-[240px] shrink-0 flex-col rounded-br-[40px] bg-[#facc15] py-8 shadow-[4px_0_24px_rgba(250,204,21,0.3)]">
            <nav className="flex flex-col gap-1 px-4">
              {[
                { label: "Dashboard", href: "#" },
                { label: "Courses", href: "#" },
                { label: "Assignments", href: "#" },
                { label: "Progress", href: "#" },
              ].map((item) => (
                <button
                  key={item.label}
                  disabled
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium text-[#111827] opacity-60 cursor-not-allowed"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* ── Main Content ── */}
          <main className="flex flex-1 flex-col overflow-y-auto px-6 py-6 lg:px-8">
            {hasPartB && (
                <div className="mb-4 flex gap-2">
                    <button 
                        onClick={() => { setCurrentPart("A"); setActiveSectionType("SCQ"); setCurrentIndex(0); }}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg ${currentPart === "A" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                    >
                        Preview Part A
                    </button>
                    <button 
                        onClick={() => { setCurrentPart("B"); setActiveSectionType("SKETCH"); setCurrentIndex(0); }}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg ${currentPart === "B" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
                    >
                        Preview Part B
                    </button>
                </div>
            )}
            
            {questions.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-500 font-medium">Add questions to see them in the preview.</p>
                </div>
            ) : (
                <>
                    {/* Section Navigator */}
                    {sectionTabs.length > 0 && (
                    <div className="mb-5">
                        <SectionNavigator
                        sections={sectionTabs}
                        activeType={activeSectionType}
                        onChangeSection={(type) => {
                            setActiveSectionType(type);
                            setCurrentIndex(0);
                        }}
                        partLabel={`Part ${currentPart}`}
                        timeDisplay={formatTime(timeLeft)}
                        isUrgent={urgentTime}
                        />
                    </div>
                    )}

                    {/* Current Question */}
                    <AnimatePresence mode="wait">
                        {currentQ && (
                            <motion.div
                            key={globalIndex}
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.18 }}
                            >
                            <QuestionCard
                                question={currentQ}
                                questionNumber={globalIndex + 1}
                                totalQuestions={questions.length}
                                selectedAnswer={answers[globalIndex]}
                                onAnswer={handleAnswer}
                                isFlagged={statuses[globalIndex] === "MARKED_FOR_REVIEW" || statuses[globalIndex] === "ANSWERED_AND_MARKED"}
                                onToggleFlag={handleMarkReview}
                                watermark={watermark}
                            />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Action buttons */}
                    <div className="mt-5 flex flex-wrap gap-3 rounded-[16px] border border-[#e5e7eb] bg-white p-4">
                        <button onClick={handleSaveAndNext} className="rounded-[10px] bg-[#22c55e] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#16a34a]">
                        Save & Next
                        </button>
                        <button onClick={handleMarkReview} className="rounded-[10px] bg-[#facc15] px-5 py-2 text-[13px] font-semibold text-[#1a1a1a] transition hover:bg-[#eab308]">
                        Mark for Review
                        </button>
                        <button onClick={handleClear} className="rounded-[10px] border border-gray-200 bg-white px-5 py-2 text-[13px] font-semibold text-gray-700 transition hover:bg-gray-50">
                        Clear Response
                        </button>
                    </div>

                    {/* Prev / Next / Submit */}
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex gap-3">
                        <button
                            onClick={() => {
                            if (currentIndex > 0) {
                                const prevGlobalIdx = questions.indexOf(activeSectionQuestions[currentIndex - 1] as QuestionData);
                                setStatuses((prev) => ({
                                ...prev,
                                [prevGlobalIdx]: prev[prevGlobalIdx] === "NOT_VISITED" ? "NOT_ANSWERED" : prev[prevGlobalIdx],
                                }));
                                setCurrentIndex(currentIndex - 1);
                            }
                            }}
                            disabled={currentIndex === 0}
                            className="rounded-[10px] border border-gray-200 bg-white px-5 py-2 text-[13px] font-semibold text-[#374151] shadow-sm disabled:opacity-40"
                        >
                            ← Back
                        </button>
                        <button
                            onClick={() => {
                            if (currentIndex < activeSectionQuestions.length - 1) {
                                const nextGlobalIdx = questions.indexOf(activeSectionQuestions[currentIndex + 1] as QuestionData);
                                setStatuses((prev) => ({
                                ...prev,
                                [nextGlobalIdx]: prev[nextGlobalIdx] === "NOT_VISITED" ? "NOT_ANSWERED" : prev[nextGlobalIdx],
                                }));
                                setCurrentIndex(currentIndex + 1);
                            }
                            }}
                            disabled={currentIndex === activeSectionQuestions.length - 1}
                            className="rounded-[10px] border border-gray-200 bg-white px-5 py-2 text-[13px] font-semibold text-[#374151] shadow-sm disabled:opacity-40"
                        >
                            Next →
                        </button>
                        </div>

                        <button
                        onClick={onClose}
                        className="flex items-center gap-2 rounded-[10px] bg-gray-800 px-7 py-2.5 text-[14px] font-bold text-white shadow transition hover:bg-gray-700"
                        >
                            CLOSE PREVIEW
                        </button>
                    </div>
                </>
            )}
          </main>

          {/* ── Right Sidebar (Status Panel) ── */}
          <aside className="flex w-[300px] shrink-0 flex-col border-l border-gray-100 bg-white p-5 shadow-[-4px_0_16px_rgba(0,0,0,0.03)] overflow-y-auto">
            {/* Legend */}
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              {(Object.entries(stats) as [QuestionStatus, number][]).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={`flex h-7 w-8 shrink-0 items-center justify-center rounded border text-[12px] font-medium ${statusColor[status]}`}>{count}</span>
                  <span className="text-[#6b7280] leading-tight">{status.replace(/_/g, " ").toLowerCase()}</span>
                </div>
              ))}
            </div>

            {/* Number grid — grouped by section within current part */}
            <div className="mt-6">
              <div className="space-y-4">
                {/* Current Part sections */}
                {groupQuestionsBySection(
                  currentPartQuestions.map((q) => ({
                    ...q,
                    order: questions.indexOf(q),
                  }))
                ).map((section) => (
                  <div key={section.type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                        {section.label}
                      </p>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {section.questions.map((question) => {
                        const i = question.order;
                        return (
                          <button
                            key={question.id}
                            onClick={() => {
                              navigateToGlobal(i);
                            }}
                            className={`flex h-9 w-full items-center justify-center rounded-[8px] border text-[13px] font-medium shadow-sm transition-colors ${statusColor[statuses[i] ?? "NOT_VISITED"]} ${globalIndex === i ? "ring-2 ring-[#38c1ff] ring-offset-1" : ""}`}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </motion.div>
  );
}
