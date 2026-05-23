"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { User as UserIcon, CheckCircle2, Clock, AlertTriangle, Trophy } from "lucide-react";
import { CategoryPerformancePanel } from "@/app/dashboard/_components/test-taking/category-performance-panel";
import {
  QuestionCard,
  type QuestionData,
  type QuestionWatermark,
} from "@/app/dashboard/_components/test-taking/question-card";
import { SectionNavigator, type SectionTab } from "@/app/dashboard/_components/test-taking/section-navigator";
import { LeaderboardPanel } from "@/app/dashboard/_components/test-taking/leaderboard-panel";
import { buildCategoryPerformanceBreakdown } from "@/lib/test-category-performance";
import {
  groupQuestionsBySection,
  splitQuestionsByPart,
  getPartTimeSplit,
  isPartAType,
  QUESTION_TYPE_SECTION_LABELS,
  type QuestionTypeSectionKey,
} from "@/lib/test-question-sections";

// ─── Types ─────────────────────────────────────────────────────────────────────

type QuestionStatus =
  | "NOT_VISITED"
  | "NOT_ANSWERED"
  | "ANSWERED"
  | "MARKED_FOR_REVIEW"
  | "ANSWERED_AND_MARKED";

type GradeResult = {
  attemptId: string;
  score: number;
  pointsEarned: number;
  totalPoints: number;
  isPassed: boolean;
  gradingStatus: "AUTO_GRADED" | "PENDING_REVIEW" | "FULLY_GRADED" | "PARTIAL_A_GRADED";
  passingScore: number;
  questionResults?: Record<
    string,
    { type: string; isCorrect: boolean | null; pointsAwarded: number; correctAnswer?: unknown; explanation?: string | null }
  >;
};

type ExamClientProps = {
  exam: { id: string; title: string; durationMins: number; courseTitle: string; courseId: string };
  questions: QuestionData[];
  studentName: string;
  studentEmail: string;
  studentPhone: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

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

// ─── Results Screen ────────────────────────────────────────────────────────────

function ResultsScreen({
  result,
  questions,
  answers,
  watermark,
  courseId,
  testId,
}: {
  result: GradeResult;
  questions: QuestionData[];
  answers: Record<number, unknown>;
  watermark: QuestionWatermark;
  courseId: string;
  testId: string;
}) {
  const router = useRouter();
  const isPending = result.gradingStatus === "PENDING_REVIEW" || result.gradingStatus === "PARTIAL_A_GRADED";

  // Split questions for per-part display
  const partAQuestions = questions.filter((q) => isPartAType(q.type));
  const partBQuestions = questions.filter((q) => !isPartAType(q.type));

  const partAPoints = partAQuestions.reduce((sum, q) => {
    const qr = result.questionResults?.[q.id];
    return sum + (qr?.pointsAwarded ?? 0);
  }, 0);
  const partATotal = partAQuestions.reduce((sum, q) => sum + q.points, 0);
  const partAScore = partATotal > 0 ? Math.round((partAPoints / partATotal) * 100) : 0;

  const partBPoints = partBQuestions.reduce((sum, q) => {
    const qr = result.questionResults?.[q.id];
    return sum + (qr?.pointsAwarded ?? 0);
  }, 0);
  const partBTotal = partBQuestions.reduce((sum, q) => sum + q.points, 0);

  const hasPartB = partBQuestions.length > 0;
  const partBGraded = hasPartB && result.questionResults
    ? partBQuestions.every((q) => result.questionResults?.[q.id]?.isCorrect !== null)
    : false;

  const canShowQuestionDetails = Boolean(
    result.questionResults &&
      Object.values(result.questionResults).some(
        (questionResult) =>
          questionResult.correctAnswer !== undefined || questionResult.explanation !== null
      )
  );

  const categoryBreakdown = result.questionResults
    ? buildCategoryPerformanceBreakdown(
        questions.map((question) => ({
          category: question.category,
          points: question.points,
          pointsAwarded: result.questionResults?.[question.id]?.pointsAwarded,
          isCorrect: result.questionResults?.[question.id]?.isCorrect,
        }))
      )
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex min-h-screen flex-col items-center justify-start bg-[#f5f6f8] px-4 py-12"
    >
      <div className="w-full max-w-3xl space-y-6">
        {/* Overall Score Card */}
        <div className={`rounded-[28px] px-8 py-10 text-center text-white shadow-xl ${
          result.isPassed
            ? "bg-gradient-to-br from-[#22c55e] to-[#16a34a]"
            : isPending
              ? "bg-gradient-to-br from-[#f59e0b] to-[#d97706]"
              : "bg-gradient-to-br from-[#38c1ff] to-[#0077ff]"
        }`}>
          <div className="text-6xl font-bold">{result.score}%</div>
          <div className="mt-2 text-xl font-semibold opacity-90">
            {isPending ? "Provisional Score" : result.isPassed ? "You Passed! 🎉" : "Keep Going! 💪"}
          </div>
          <div className="mt-1 text-base opacity-75">
            {result.pointsEarned} / {result.totalPoints} points earned
          </div>
        </div>

        {/* Part A / Part B Score Cards */}
        <div className={`grid gap-4 ${hasPartB ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className="rounded-[20px] bg-white p-5 shadow-sm border border-[#e5e7eb]">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#6b7280] mb-2">Part A — Auto-Graded</h3>
            <div className="text-3xl font-bold text-[#111827]">{partAScore}%</div>
            <div className="text-[13px] text-[#6b7280] mt-1">{partAPoints}/{partATotal} points</div>
            <div className="text-[12px] text-[#22c55e] font-medium mt-2">✓ Graded instantly</div>
          </div>
          {hasPartB && (
            <div className="rounded-[20px] bg-white p-5 shadow-sm border border-[#e5e7eb]">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#6b7280] mb-2">Part B — Sketching</h3>
              {partBGraded ? (
                <>
                  <div className="text-3xl font-bold text-[#111827]">
                    {partBTotal > 0 ? Math.round((partBPoints / partBTotal) * 100) : 0}%
                  </div>
                  <div className="text-[13px] text-[#6b7280] mt-1">{partBPoints}/{partBTotal} points</div>
                  <div className="text-[12px] text-[#22c55e] font-medium mt-2">✓ Graded by teacher</div>
                </>
              ) : (
                <>
                  <div className="text-3xl font-bold text-[#f59e0b]">—</div>
                  <div className="text-[13px] text-[#6b7280] mt-1">{partBTotal} points total</div>
                  <div className="text-[12px] text-[#f59e0b] font-medium mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Pending teacher review
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Score", value: `${result.score}%`, color: "text-[#38c1ff]" },
            { label: "Passing Score", value: `${result.passingScore}%`, color: "text-[#f59e0b]" },
            { label: "Status", value: isPending ? "Pending" : result.isPassed ? "Passed" : "Failed", color: result.isPassed ? "text-[#22c55e]" : isPending ? "text-[#f59e0b]" : "text-[#ef4444]" },
          ].map((s) => (
            <div key={s.label} className="rounded-[16px] bg-white px-4 py-4 text-center shadow-sm">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="mt-1 text-[12px] text-[#9ca3af]">{s.label}</div>
            </div>
          ))}
        </div>

        {categoryBreakdown.length > 0 && (
          <div className="rounded-[20px] bg-white p-6 shadow-sm">
            <CategoryPerformancePanel
              items={categoryBreakdown}
              description="Your exam score grouped by the tags attached to each question."
            />
          </div>
        )}

        {/* Leaderboard */}
        <div className="rounded-[20px] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-[#f59e0b]" />
            <h2 className="text-[18px] font-semibold text-[#111827]">Leaderboard</h2>
          </div>
          <LeaderboardPanel courseId={courseId} testId={testId} />
        </div>

        {/* Per-question breakdown */}
        {result.questionResults && canShowQuestionDetails && (
          <div className="rounded-[20px] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-[18px] font-semibold text-[#111827]">Question Breakdown</h2>
            <div className="space-y-3">
              {questions.map((q, i) => {
                const qr = result.questionResults![q.id];
                if (!qr) return null;
                return (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    questionNumber={i + 1}
                    totalQuestions={questions.length}
                    selectedAnswer={answers[i]}
                    onAnswer={() => {}}
                    showResult
                    correctAnswer={qr.correctAnswer}
                    explanation={qr.explanation}
                    watermark={watermark}
                  />
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={() => router.push(`/dashboard/courses`)}
          className="w-full rounded-[14px] bg-[#38c1ff] py-4 text-[16px] font-bold text-white shadow-lg transition hover:bg-[#0ea5e9]"
        >
          Back to Courses
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main ExamClient ───────────────────────────────────────────────────────────

export function ExamClient({
  exam,
  questions,
  studentName,
  studentEmail,
  studentPhone,
}: ExamClientProps) {
  const router = useRouter();

  // ── Part A/B split ──
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

  // ── State ──
  const [currentPart, setCurrentPart] = useState<"A" | "B">("A");
  const [currentIndex, setCurrentIndex] = useState(0); // index within current part's questions
  const [answers, setAnswers] = useState<Record<number, unknown>>({}); // keyed by global question index
  const [statuses, setStatuses] = useState<Record<number, QuestionStatus>>(() => {
    const init: Record<number, QuestionStatus> = { 0: "NOT_ANSWERED" };
    questions.forEach((_, i) => { if (i !== 0) init[i] = "NOT_VISITED"; });
    return init;
  });
  const [partATimeLeft, setPartATimeLeft] = useState(partASecs);
  const [partBTimeLeft, setPartBTimeLeft] = useState(partBSecs);
  const [partALocked, setPartALocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);

  // Active section type for the section navigator
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
    currentPartSections[0]?.type ?? "SCQ"
  );

  // Get questions for the active section
  const activeSectionQuestions = useMemo(() => {
    const section = currentPartSections.find((s) => s.type === activeSectionType);
    return section?.questions ?? [];
  }, [currentPartSections, activeSectionType]);

  // The global index of the current question
  const globalIndex = useMemo(() => {
    if (activeSectionQuestions.length === 0) return 0;
    const q = activeSectionQuestions[Math.min(currentIndex, activeSectionQuestions.length - 1)];
    return questions.indexOf(q as QuestionData);
  }, [activeSectionQuestions, currentIndex, questions]);

  // ── Timer: Part A ──
  useEffect(() => {
    if (result || partALocked || currentPart !== "A") return;
    if (partATimeLeft <= 0) {
      // Auto-lock Part A
      setPartALocked(true);
      if (hasPartB) {
        setCurrentPart("B");
        setCurrentIndex(0);
        setActiveSectionType("SKETCH");
        // Mark first Part B question as visited
        const firstPartBGlobalIdx = questions.indexOf(partBQuestions[0]);
        if (firstPartBGlobalIdx >= 0) {
          setStatuses((prev) => ({
            ...prev,
            [firstPartBGlobalIdx]: prev[firstPartBGlobalIdx] === "NOT_VISITED" ? "NOT_ANSWERED" : prev[firstPartBGlobalIdx],
          }));
        }
      } else {
        // No Part B — auto-submit full exam
        void handleFullSubmit();
      }
      return;
    }
    const timer = setInterval(() => {
      setPartATimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partATimeLeft, partALocked, currentPart, result]);

  // ── Timer: Part B ──
  useEffect(() => {
    if (result || currentPart !== "B") return;
    if (partBTimeLeft <= 0) {
      void handleFullSubmit();
      return;
    }
    const timer = setInterval(() => {
      setPartBTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partBTimeLeft, currentPart, result]);

  // ── Handlers ──
  const handleAnswer = useCallback((questionId: string, answer: unknown) => {
    const idx = questions.findIndex((q) => q.id === questionId);
    if (idx === -1) return;
    // Don't allow editing locked Part A answers
    if (partALocked && isPartAType(questions[idx].type)) return;
    setAnswers((prev) => ({ ...prev, [idx]: answer }));
  }, [questions, partALocked]);

  const navigateToGlobal = (globalIdx: number) => {
    const q = questions[globalIdx];
    if (!q) return;
    // Don't allow navigating to locked Part A questions from Part B
    if (partALocked && isPartAType(q.type)) return;
    setStatuses((prev) => {
      if (prev[globalIdx] === "NOT_VISITED" || prev[globalIdx] === undefined) {
        return { ...prev, [globalIdx]: "NOT_ANSWERED" };
      }
      return prev;
    });
    // Figure out the local index within the section
    const sectionQs = activeSectionQuestions;
    const localIdx = sectionQs.findIndex((sq) => questions.indexOf(sq as QuestionData) === globalIdx);
    if (localIdx >= 0) {
      setCurrentIndex(localIdx);
    } else {
      // Question is in a different section — switch to it
      setActiveSectionType(q.type);
      // We'll set the local index after re-render, so set to 0 as placeholder
      setCurrentIndex(0);
      // Find proper local index within that section
      const newSectionQs = currentPartSections.find((s) => s.type === q.type)?.questions ?? [];
      const newLocalIdx = newSectionQs.findIndex((sq) => questions.indexOf(sq as QuestionData) === globalIdx);
      if (newLocalIdx >= 0) setCurrentIndex(newLocalIdx);
    }
  };

  const handleSaveAndNext = () => {
    const q = questions[globalIndex];
    const answered = isAnswered(answers[globalIndex], q.type);
    setStatuses((prev) => ({ ...prev, [globalIndex]: answered ? "ANSWERED" : "NOT_ANSWERED" }));

    // Move to next question in section
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

  const handleFullSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const answersById: Record<string, unknown> = {};
    questions.forEach((q, i) => {
      if (answers[i] !== undefined) answersById[q.id] = answers[i];
    });

    try {
      const res = await fetch(`/api/courses/${exam.courseId}/tests/${exam.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: answersById,
          timeSpentSecs: totalDurationSecs - (partATimeLeft + partBTimeLeft),
        }),
      });
      const json = await res.json();
      if (!json.success && !json.data) {
        throw new Error(json.error || "Submission failed");
      }
      setResult(json.data);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  // ── Build section tabs ──
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

  // ── Status counts ──
  const stats = { NOT_VISITED: 0, NOT_ANSWERED: 0, ANSWERED: 0, MARKED_FOR_REVIEW: 0, ANSWERED_AND_MARKED: 0 };
  Object.values(statuses).forEach((s) => stats[s]++);

  const currentQ = questions[globalIndex];
  if (!currentQ) return null;
  const watermark: QuestionWatermark = { name: studentName, email: studentEmail, phone: studentPhone };

  // Show results screen (after full test is completed)
  if (result) {
    return (
      <ResultsScreen
        result={result}
        questions={questions}
        answers={answers}
        watermark={watermark}
        courseId={exam.courseId}
        testId={exam.id}
      />
    );
  }

  const timeLeft = currentPart === "A" ? partATimeLeft : partBTimeLeft;
  const urgentTime = timeLeft < 300;

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f6f8] font-sans">
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
            <h1 className="text-[20px] font-bold tracking-wide uppercase">{exam.title}</h1>
            <div className="flex items-center gap-3 text-[12px] text-white/80">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                currentPart === "A" ? "bg-white/20" : "bg-amber-400/30"
              }`}>
                Part {currentPart}
              </span>
              {hasPartB && !partALocked && (
                <span>Part A: SCQ + MCQ + Numeric</span>
              )}
              {hasPartB && partALocked && (
                <span>Part B: Sketching</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-medium">{studentName}</span>
                <span className={`text-[12px] ${urgentTime ? "text-red-200 font-bold animate-pulse" : "text-white/90"}`}>
                  {urgentTime && "⚠️ "}Time left:{" "}
                  <span className={`font-bold ${urgentTime ? "text-red-200" : "text-[#facc15]"}`}>
                    {formatTime(timeLeft)}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Sidebar ── */}
        <aside className="flex w-[240px] shrink-0 flex-col rounded-br-[40px] bg-[#facc15] py-8 shadow-[4px_0_24px_rgba(250,204,21,0.3)]">
          <nav className="flex flex-col gap-1 px-4">
            {[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Courses", href: "/dashboard/courses" },
              { label: "Assignments", href: "/dashboard/assignments" },
              { label: "Progress", href: "/dashboard/progress" },
            ].map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium text-[#111827] transition hover:bg-white/20"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex flex-1 flex-col overflow-y-auto px-6 py-6 lg:px-8">
          {/* Part A locked banner */}
          {partALocked && currentPart === "B" && (
            <div className="mb-4 flex items-center gap-2 rounded-[14px] bg-amber-50 px-4 py-3 text-[14px] text-amber-800 border border-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Part A is locked. You are now in <strong className="ml-1">Part B — Sketching</strong>. You have{" "}
              <strong className="mx-1">{formatTime(partBTimeLeft)}</strong> remaining.
            </div>
          )}

          {submitError && (
            <div className="mb-4 flex items-center gap-2 rounded-[12px] bg-red-50 px-4 py-3 text-[14px] text-red-700 border border-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          {/* Section Navigator */}
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

          {/* Current Question */}
          <AnimatePresence mode="wait">
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
              onClick={() => { if (window.confirm("Submit the exam? You cannot change your answers after this.")) void handleFullSubmit(); }}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-[10px] bg-[#22c55e] px-7 py-2.5 text-[14px] font-bold text-white shadow transition hover:bg-[#16a34a] disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  SUBMIT
                </>
              )}
            </button>
          </div>
        </main>

        {/* ── Right Sidebar (Status Panel) ── */}
        <aside className="flex w-[300px] shrink-0 flex-col border-l border-gray-100 bg-white p-5 shadow-[-4px_0_16px_rgba(0,0,0,0.03)]">
          {/* Legend */}
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            {(Object.entries(stats) as [QuestionStatus, number][]).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`flex h-7 w-8 items-center justify-center rounded border text-[12px] font-medium ${statusColor[status]}`}>{count}</span>
                <span className="text-[#6b7280] leading-tight">{status.replace(/_/g, " ").toLowerCase()}</span>
              </div>
            ))}
          </div>

          {/* Number grid — grouped by section within current part */}
          <div className="mt-6">
            <div className="space-y-4">
              {/* Part A sections */}
              {groupQuestionsBySection(
                partAQuestions.map((q) => ({
                  ...q,
                  order: questions.indexOf(q),
                }))
              ).map((section) => (
                <div key={section.type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                      {section.label}
                    </p>
                    {partALocked && (
                      <span className="text-[10px] text-[#9ca3af] font-medium">🔒 Locked</span>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {section.questions.map((question) => {
                      const i = question.order;
                      return (
                        <button
                          key={question.id}
                          onClick={() => {
                            if (partALocked) return;
                            navigateToGlobal(i);
                          }}
                          disabled={partALocked}
                          className={`flex h-9 w-full items-center justify-center rounded-[8px] border text-[13px] font-medium shadow-sm transition-colors ${statusColor[statuses[i] ?? "NOT_VISITED"]} ${globalIndex === i ? "ring-2 ring-[#38c1ff] ring-offset-1" : ""} ${partALocked ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Part B sections */}
              {hasPartB && (
                <>
                  <div className="border-t border-[#e5e7eb] pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f59e0b] mb-2">
                      Part B — Sketching
                    </p>
                  </div>
                  {groupQuestionsBySection(
                    partBQuestions.map((q) => ({
                      ...q,
                      order: questions.indexOf(q),
                    }))
                  ).map((section) => (
                    <div key={section.type} className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                        {section.label}
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {section.questions.map((question) => {
                          const i = question.order;
                          const isLocked = !partALocked; // Part B locked until Part A is done
                          return (
                            <button
                              key={question.id}
                              onClick={() => {
                                if (isLocked) return;
                                navigateToGlobal(i);
                              }}
                              disabled={isLocked}
                              className={`flex h-9 w-full items-center justify-center rounded-[8px] border text-[13px] font-medium shadow-sm transition-colors ${statusColor[statuses[i] ?? "NOT_VISITED"]} ${globalIndex === i ? "ring-2 ring-[#38c1ff] ring-offset-1" : ""} ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              {i + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
