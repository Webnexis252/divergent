"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { User as UserIcon, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { CategoryPerformancePanel } from "@/app/dashboard/_components/test-taking/category-performance-panel";
import {
  QuestionCard,
  type QuestionData,
  type QuestionWatermark,
} from "@/app/dashboard/_components/test-taking/question-card";
import { buildCategoryPerformanceBreakdown } from "@/lib/test-category-performance";
import { groupQuestionsBySection } from "@/lib/test-question-sections";

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
  gradingStatus: "AUTO_GRADED" | "PENDING_REVIEW" | "FULLY_GRADED";
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
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
}: {
  result: GradeResult;
  questions: QuestionData[];
  answers: Record<number, unknown>;
  watermark: QuestionWatermark;
}) {
  const router = useRouter();
  const isPending = result.gradingStatus === "PENDING_REVIEW";
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
      <div className="w-full max-w-2xl space-y-6">
        {/* Score Card */}
        <div className={`rounded-[28px] px-8 py-10 text-center text-white shadow-xl ${result.isPassed ? "bg-gradient-to-br from-[#22c55e] to-[#16a34a]" : isPending ? "bg-gradient-to-br from-[#f59e0b] to-[#d97706]" : "bg-gradient-to-br from-[#38c1ff] to-[#0077ff]"}`}>
          <div className="text-6xl font-bold">{result.score}%</div>
          <div className="mt-2 text-xl font-semibold opacity-90">
            {isPending ? "Provisional Score" : result.isPassed ? "You Passed! 🎉" : "Keep Going! 💪"}
          </div>
          <div className="mt-1 text-base opacity-75">
            {result.pointsEarned} / {result.totalPoints} points earned
          </div>
          {isPending && (
            <div className="mt-4 rounded-2xl bg-white/20 px-4 py-3 text-sm">
              <Clock className="inline-block h-4 w-4 mr-1" />
              Sketch answers are pending teacher review. Final score will be updated.
            </div>
          )}
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Score", value: `${result.score}%`, color: "text-[#38c1ff]" },
            { label: "Passing Score", value: `${result.passingScore}%`, color: "text-[#f59e0b]" },
            { label: "Status", value: isPending ? "Pending" : result.isPassed ? "Passed" : "Failed", color: result.isPassed ? "text-[#22c55e]" : "text-[#ef4444]" },
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [statuses, setStatuses] = useState<Record<number, QuestionStatus>>(() => {
    const init: Record<number, QuestionStatus> = { 0: "NOT_ANSWERED" };
    questions.forEach((_, i) => { if (i !== 0) init[i] = "NOT_VISITED"; });
    return init;
  });
  const [timeLeft, setTimeLeft] = useState(exam.durationMins * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);

  // Timer
  useEffect(() => {
    if (result || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); void handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, result]);

  const updateStatusAndGo = (status: QuestionStatus, targetIdx?: number) => {
    setStatuses((prev) => {
      const next = { ...prev, [currentIndex]: status };
      const t = targetIdx !== undefined ? targetIdx : currentIndex + 1;
      if (t >= 0 && t < questions.length && (next[t] === "NOT_VISITED" || next[t] === undefined)) {
        next[t] = "NOT_ANSWERED";
      }
      return next;
    });
    const t = targetIdx !== undefined ? targetIdx : currentIndex + 1;
    if (t >= 0 && t < questions.length) setCurrentIndex(t);
  };

  const handleAnswer = useCallback((questionId: string, answer: unknown) => {
    const idx = questions.findIndex((q) => q.id === questionId);
    if (idx === -1) return;
    setAnswers((prev) => ({ ...prev, [idx]: answer }));
  }, [questions]);

  const handleSaveAndNext = () => {
    const q = questions[currentIndex];
    const answered = isAnswered(answers[currentIndex], q.type);
    updateStatusAndGo(answered ? "ANSWERED" : "NOT_ANSWERED");
  };

  const handleMarkReview = () => {
    const q = questions[currentIndex];
    const answered = isAnswered(answers[currentIndex], q.type);
    updateStatusAndGo(answered ? "ANSWERED_AND_MARKED" : "MARKED_FOR_REVIEW");
  };

  const handleClear = () => {
    setAnswers((prev) => { const n = { ...prev }; delete n[currentIndex]; return n; });
    setStatuses((prev) => ({ ...prev, [currentIndex]: "NOT_ANSWERED" }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    // Build answers map: questionId → answer
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
          timeSpentSecs: exam.durationMins * 60 - timeLeft,
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

  // ── Status counts
  const stats = { NOT_VISITED: 0, NOT_ANSWERED: 0, ANSWERED: 0, MARKED_FOR_REVIEW: 0, ANSWERED_AND_MARKED: 0 };
  Object.values(statuses).forEach((s) => stats[s]++);

  const currentQ = questions[currentIndex];
  if (!currentQ) return null;
  const watermark: QuestionWatermark = {
    name: studentName,
    email: studentEmail,
    phone: studentPhone,
  };
  const questionSections = groupQuestionsBySection(
    questions.map((question, index) => ({
      ...question,
      order: index,
    }))
  );

  // Show results screen
  if (result) {
    return (
      <ResultsScreen
        result={result}
        questions={questions}
        answers={answers}
        watermark={watermark}
      />
    );
  }

  const urgentTime = timeLeft < 300; // < 5 min

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
          <h1 className="text-[20px] font-bold tracking-wide uppercase">{exam.title}</h1>
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
          {submitError && (
            <div className="mb-4 flex items-center gap-2 rounded-[12px] bg-red-50 px-4 py-3 text-[14px] text-red-700 border border-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              <QuestionCard
                question={currentQ}
                questionNumber={currentIndex + 1}
                totalQuestions={questions.length}
                selectedAnswer={answers[currentIndex]}
                onAnswer={handleAnswer}
                isFlagged={statuses[currentIndex] === "MARKED_FOR_REVIEW" || statuses[currentIndex] === "ANSWERED_AND_MARKED"}
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
                onClick={() => updateStatusAndGo(statuses[currentIndex], currentIndex - 1)}
                disabled={currentIndex === 0}
                className="rounded-[10px] border border-gray-200 bg-white px-5 py-2 text-[13px] font-semibold text-[#374151] shadow-sm disabled:opacity-40"
              >
                ← Back
              </button>
              <button
                onClick={() => updateStatusAndGo(statuses[currentIndex], currentIndex + 1)}
                disabled={currentIndex === questions.length - 1}
                className="rounded-[10px] border border-gray-200 bg-white px-5 py-2 text-[13px] font-semibold text-[#374151] shadow-sm disabled:opacity-40"
              >
                Next →
              </button>
            </div>

            <button
              onClick={() => { if (window.confirm("Submit the exam? You cannot change your answers after this.")) void handleSubmit(); }}
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

          {/* Number grid */}
          <div className="mt-6">
            <div className="space-y-4">
              {questionSections.map((section) => (
                <div key={section.type} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                    {section.label}
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {section.questions.map((question) => {
                      const i = question.order;
                      return (
                        <button
                          key={question.id}
                          onClick={() => {
                            setStatuses((prev) => {
                              if (prev[i] === "NOT_VISITED") return { ...prev, [i]: "NOT_ANSWERED" };
                              return prev;
                            });
                            setCurrentIndex(i);
                          }}
                          className={`flex h-9 w-full items-center justify-center rounded-[8px] border text-[13px] font-medium shadow-sm transition-colors ${statusColor[statuses[i]]} ${currentIndex === i ? "ring-2 ring-[#38c1ff] ring-offset-1" : ""}`}
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
  );
}
