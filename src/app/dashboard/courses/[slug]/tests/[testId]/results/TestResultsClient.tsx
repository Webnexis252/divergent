"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, CheckCircle2, Flag, Trophy, X } from "lucide-react";
import {
  QuestionCard,
  type QuestionData,
  type QuestionWatermark,
} from "@/app/dashboard/_components/test-taking/question-card";
import { LeaderboardPanel } from "@/app/dashboard/_components/test-taking/leaderboard-panel";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";

export type QuestionBreakdown = {
  id: string;
  prompt: string;
  type: string;
  category: QuestionData["category"] | null;
  options: string[];
  correctAnswer: unknown;
  userAnswer: unknown;
  isCorrect: boolean | null;
  explanation: string | null;
  explanationImageUrl?: string | null;
  points: number;
  pointsAwarded: number;
  negativeMarks?: number;
  difficulty: string | null;
};

export type Attempt = {
  id: string;
  score: number;
  pointsEarned: number;
  totalPoints: number;
  isPassed: boolean;
  startedAt: string;
  submittedAt: string | null;
  timeSpentSecs: number | null;
  questionBreakdown: QuestionBreakdown[] | null;
};

export type TestResultData = {
  test: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    durationMins: number;
    totalQuestions: number;
    passingScore: number;
    maxAttempts: number;
  };
  stats: {
    totalAttempts: number;
    bestScore: number;
    avgScore: number;
    canRetake: boolean;
    attemptsRemaining: number | string;
  };
  attempts: Attempt[];
};

/* ─── Report-Question Modal ─────────────────────────────────────────────── */
type ReportTarget = {
  questionIndex: number;
  questionId: string;
  prompt: string;
};

function ReportModal({
  target,
  testTitle,
  onClose,
  onSuccess,
}: {
  target: ReportTarget;
  testTitle: string;
  onClose: () => void;
  onSuccess: (questionId: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!reason.trim()) {
      setError("Please describe the issue before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `Question Report: Q${target.questionIndex + 1} — ${testTitle}`,
          body: `I am reporting **Question #${target.questionIndex + 1}** from the test "${testTitle}".\n\n**Question:** ${target.prompt.slice(0, 300)}${target.prompt.length > 300 ? "…" : ""}\n\n**Issue reported by student:**\n${reason.trim()}`,
          priority: "HIGH",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "Failed to submit report. Please try again.");
      } else {
        onSuccess(target.questionId);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
            <Flag className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-gray-900">Report Question</h3>
            <p className="text-[12px] text-gray-500">
              Q{target.questionIndex + 1} · This will be sent to the admin as a doubt
            </p>
          </div>
        </div>

        <div className="mb-1 rounded-lg bg-gray-50 px-3 py-2 text-[12px] text-gray-500 line-clamp-2 border border-gray-100">
          {target.prompt.slice(0, 120)}
          {target.prompt.length > 120 ? "…" : ""}
        </div>

        <label className="mt-4 block text-[13px] font-semibold text-gray-700 mb-2">
          What&apos;s wrong with this question?
        </label>
        <textarea
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] text-gray-800 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 resize-none"
          placeholder="e.g. The answer key is wrong, the question is ambiguous, the explanation is incorrect…"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {error && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[14px] font-semibold text-gray-600 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-xl bg-orange-500 py-2.5 text-[14px] font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors"
            disabled={submitting || !reason.trim()}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting…" : "Submit Report"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────── */
export function TestResultsClient({
  data,
  slug,
  testId,
  courseId,
}: {
  data: TestResultData | null;
  slug: string;
  testId: string;
  courseId: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedAttemptIndex] = useState(0);
  const [showQuestions, setShowQuestions] = useState(false);

  // Report state
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  // Security watermark
  const watermark: QuestionWatermark | undefined = user
    ? { name: user.name ?? "Student", email: user.email ?? "", phone: "" }
    : undefined;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-gray-600 mb-4">No data found</p>
        <Button variant="secondary" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const selectedAttempt = data.attempts[selectedAttemptIndex];

  if (data.attempts.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#f5f6f8] px-4 py-12">
        <div className="w-full max-w-xl text-center rounded-[28px] bg-white px-8 py-12 shadow-sm border border-gray-100">
          <Trophy className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{data.test.title}</h2>
          <p className="text-gray-500 mb-8">
            You haven&apos;t attempted this test yet. Start now to see your results and join the leaderboard!
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="secondary" onClick={() => router.push(`/dashboard/courses/${slug}/tests`)}>
              Back to Tests
            </Button>
            <Button
              className="bg-[#38c1ff] hover:bg-[#0ea5e9] text-white shadow-lg"
              onClick={() => router.push(`/dashboard/courses/${slug}/tests/${testId}`)}
            >
              Take Test
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = data.test.totalQuestions;
  const questions = selectedAttempt?.questionBreakdown ?? [];
  const correctCount = questions.filter((q) => q.isCorrect === true).length;
  const incorrectCount = questions.filter((q) => q.isCorrect === false && q.userAnswer).length;
  const skippedCount = questions.filter(
    (q) => !q.userAnswer || (Array.isArray(q.userAnswer) && q.userAnswer.length === 0)
  ).length;

  const correctMarks = questions
    .filter((q) => q.isCorrect === true)
    .reduce((sum, q) => sum + q.pointsAwarded, 0);
  const incorrectMarks = questions
    .filter(
      (q) =>
        q.isCorrect === false &&
        q.userAnswer &&
        !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0)
    )
    .reduce((sum, q) => sum + q.points, 0);
  const negativeMarking = questions
    .filter(
      (q) =>
        q.isCorrect === false &&
        q.userAnswer &&
        !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0)
    )
    .reduce((sum, q) => sum + (q.negativeMarks || 0), 0);
  const skippedMarks = questions
    .filter((q) => !q.userAnswer || (Array.isArray(q.userAnswer) && q.userAnswer.length === 0))
    .reduce((sum, q) => sum + q.points, 0);

  const accuracy =
    totalQuestions > 0
      ? Math.round((correctCount / (totalQuestions - skippedCount)) * 100) || 0
      : 0;
  const percentage = data.test.totalQuestions > 0 ? selectedAttempt.score : 0;

  const correctPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const incorrectPct =
    totalQuestions > 0 ? Math.round((incorrectCount / totalQuestions) * 100) : 0;
  const skippedPct = totalQuestions > 0 ? 100 - correctPct - incorrectPct : 0;

  const sectionTypes = [
    { type: "NUMERIC", label: "NAT" },
    { type: "MCQ", label: "MSQ" },
    { type: "SCQ", label: "MCQ" },
    { type: "SKETCH", label: "Part B (DST)" },
  ];
  const sections = sectionTypes.map((sec) => {
    const secQuestions = questions.filter((q) => q.type === sec.type);
    const secTotal = secQuestions.reduce((sum, q) => sum + q.points, 0);
    const secEarned = secQuestions.reduce((sum, q) => sum + q.pointsAwarded, 0);
    const secCorrect = secQuestions.filter((q) => q.isCorrect === true).length;
    const secAttempted = secQuestions.filter(
      (q) => q.userAnswer && !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0)
    ).length;
    const secAccuracy = secAttempted > 0 ? Math.round((secCorrect / secAttempted) * 100) : 0;
    const secPercentage = secTotal > 0 ? Math.round((secEarned / secTotal) * 100) : 0;
    return { ...sec, total: secTotal, earned: secEarned, accuracy: secAccuracy, percentage: secPercentage };
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex min-h-screen flex-col items-center justify-start bg-[#f9fafb] px-4 py-8 sm:py-12"
    >
      <div className="w-full max-w-[1100px]">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            className="text-gray-500 hover:text-gray-900 -ml-4"
            onClick={() => router.push(`/dashboard/courses/${slug}/tests`)}
          >
            ← Back to Tests
          </Button>
        </div>

        <h1 className="text-[28px] font-bold text-[#111827] mb-8">{data.test.title}</h1>

        {/* Top Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          {/* Score Card */}
          <div className="rounded-[12px] bg-white p-8 shadow-sm border border-gray-100 flex flex-col justify-center items-center">
            <h2 className="text-[20px] font-bold text-gray-800 mb-6 w-full text-center">Your Score</h2>
            <div className="text-center mb-8">
              <span className="text-5xl font-bold text-gray-900">{selectedAttempt.pointsEarned}</span>
              <div className="text-[18px] font-semibold text-gray-400 mt-2">
                out of {selectedAttempt.totalPoints}
              </div>
            </div>
            <div className="w-full space-y-4 text-[14px] mb-8 px-4">
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <span className="text-gray-600 font-bold">Percentile</span>
                <span className="text-gray-900 font-bold">N/A</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <span className="text-gray-600 font-bold">Accuracy</span>
                <span className="text-gray-900 font-bold">{accuracy}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-bold">Percentage</span>
                <span className="text-gray-900 font-bold">{percentage}%</span>
              </div>
            </div>
            <Button
              className="w-full bg-[#0062ff] hover:bg-[#0052cc] text-white font-bold py-6 text-[15px] rounded-[8px]"
              onClick={() => setShowQuestions(!showQuestions)}
            >
              {showQuestions ? "HIDE SOLUTION" : "VIEW SOLUTION"}
            </Button>
          </div>

          {/* Total Marks Card */}
          <div className="rounded-[12px] bg-white p-8 shadow-sm border border-gray-100">
            <h2 className="text-[16px] font-semibold text-gray-800 mb-10">
              Total Marks <span className="font-bold">{selectedAttempt.totalPoints}</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {[
                { label: "Correct", value: correctMarks, color: "text-gray-900" },
                { label: "Incorrect", value: incorrectMarks, color: "text-gray-900" },
                { label: "Negative Marking", value: negativeMarking, color: "text-gray-900" },
                { label: "Skipped", value: `-${skippedMarks}`, color: "text-gray-600", bold: true },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center">
                  <div className="w-[110px] h-[110px] rounded-full border-[3px] border-[#f1f5f9] flex items-center justify-center mb-4">
                    <span className={`text-[28px] font-medium ${item.color}`}>{item.value}</span>
                  </div>
                  <span className="text-[15px] font-bold text-[#1e293b] text-center">{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[15px] text-gray-600 leading-relaxed font-medium">
              You have scored <span className="font-bold text-gray-900">{correctMarks} marks</span> for
              correct answers, missed{" "}
              <span className="font-bold text-gray-900">{incorrectMarks} marks</span> on incorrect answers,
              lost <span className="font-bold text-gray-900">{negativeMarking} marks</span> due to negative
              marking and <span className="font-bold text-gray-900">{skippedMarks} marks</span> by skipping
              questions.
            </p>
          </div>
        </div>

        {/* Section Analysis */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[24px] font-bold text-[#1e293b]">Section Analysis</h2>
            <button className="text-[14px] font-bold text-[#1e293b] flex items-center gap-1">
              Compare Sections <span className="text-xl">→</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sections.map((sec) => (
              <div
                key={sec.type}
                className="bg-white rounded-[12px] shadow-sm border border-gray-100 p-8 flex flex-col items-center"
              >
                <h3 className="text-[18px] font-bold text-[#1e293b] mb-8">{sec.label}</h3>
                <div className="text-center mb-10">
                  <span className="text-[36px] font-medium text-[#fb7185]">{sec.earned}</span>
                  <div className="text-[18px] font-medium text-[#94a3b8] mt-1">out of {sec.total}</div>
                </div>
                <div className="w-full space-y-4 border-t border-gray-100 pt-6">
                  {[
                    { label: "Percentile", value: "N/A" },
                    { label: "Accuracy", value: `${sec.accuracy}%` },
                    { label: "Percentage", value: `${sec.percentage}%` },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center text-[14px]">
                      <span className="text-[#334155] font-bold">{row.label}</span>
                      <span className="text-gray-900 font-bold">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question Report Summary */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[24px] font-bold text-[#1e293b]">Question Report</h2>
          </div>
          <div className="bg-white rounded-[12px] shadow-sm border border-gray-100 p-8 flex flex-wrap justify-between items-center text-center gap-4">
            {[
              { label: "Questions", value: totalQuestions, color: "text-[#1e293b]" },
              { label: "Correct", value: correctCount, color: "text-[#4ade80]" },
              { label: "Incorrect", value: incorrectCount, color: "text-[#fb7185]" },
              { label: "Skipped", value: skippedCount, color: "text-[#1e293b]" },
              { label: "Score", value: selectedAttempt.score, color: "text-[#1e293b]" },
            ].map((item) => (
              <div key={item.label} className="flex-1 min-w-[80px]">
                <div className={`text-[32px] font-medium mb-2 ${item.color}`}>{item.value}</div>
                <div className="text-[16px] font-semibold text-[#94a3b8]">{item.label}</div>
              </div>
            ))}
            <div className="flex-1 min-w-[120px] border-l border-gray-100 pl-4">
              <div className="text-[32px] font-medium text-[#1e293b] mb-2">
                {selectedAttempt.timeSpentSecs
                  ? `${Math.floor(selectedAttempt.timeSpentSecs / 60)}m ${selectedAttempt.timeSpentSecs % 60}s`
                  : "—"}
              </div>
              <div className="text-[16px] font-semibold text-[#94a3b8]">
                Time
                <br />
                Taken
              </div>
            </div>
          </div>
        </div>

        {/* How did you perform? */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[24px] font-bold text-[#1e293b]">How did you perform?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2.5fr] gap-6">
            <div className="bg-white rounded-[12px] shadow-sm border border-gray-100 p-8 flex flex-col items-center">
              <h3 className="text-[18px] font-bold text-[#1e293b] mb-8 w-full text-center">
                Question Breakdown
              </h3>
              <div
                className="w-48 h-48 rounded-full mb-6 flex items-center justify-center relative"
                style={{
                  background: `conic-gradient(#4ade80 0% ${correctPct}%, #fb7185 ${correctPct}% ${correctPct + incorrectPct}%, #cbd5e1 ${correctPct + incorrectPct}% 100%)`,
                }}
              >
                <div className="w-36 h-36 bg-white rounded-full flex flex-col items-center justify-center z-10 shadow-inner">
                  <div className="text-[24px] font-bold text-[#1e293b] mb-0.5">
                    {selectedAttempt.timeSpentSecs
                      ? `${Math.floor(selectedAttempt.timeSpentSecs / 60)}m ${selectedAttempt.timeSpentSecs % 60}s`
                      : "—"}
                  </div>
                  <div className="text-[12px] font-semibold text-[#64748b] text-center leading-tight">
                    Total Time
                    <br />
                    Spent
                  </div>
                </div>
              </div>
              <div className="w-full space-y-4 text-sm mt-4">
                {[
                  { label: "Correct Answers", value: `${correctPct}%`, color: "text-[#4ade80]" },
                  { label: "Incorrect Answers", value: `${incorrectPct}%`, color: "text-[#fb7185]" },
                  { label: "Skipped", value: `${skippedPct}%`, color: "text-[#cbd5e1]" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center text-[14px]">
                    <span className="text-[#64748b] font-semibold">{row.label}</span>
                    <span className={`font-bold ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[12px] shadow-sm border border-gray-100 p-8">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-[18px] font-bold text-[#1e293b]">Score Analysis</h3>
                <span className="text-[15px] font-semibold text-[#64748b]">
                  Total Questions{" "}
                  <span className="text-[#1e293b] ml-1">{totalQuestions}</span>
                </span>
              </div>
              <div className="flex items-center gap-6 mb-12 text-[14px] font-semibold">
                <span className="text-[#1e293b]">Attempts</span>
                <div className="flex gap-5 ml-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded bg-[#4ade80]" />
                    Correct {correctCount}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded bg-[#fb7185]" />
                    Incorrect {incorrectCount}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded bg-[#cbd5e1]" />
                    Skipped {skippedCount}
                  </div>
                </div>
              </div>

              <div className="h-[280px] w-full border-b-2 border-l-2 border-gray-100 flex items-end pl-2 gap-2 relative mt-10">
                <div className="absolute left-[-70px] top-0 bottom-0 flex flex-col justify-between text-[12px] font-semibold text-gray-500 py-4">
                  <span>Correct -</span>
                  <span>Incorrect -</span>
                  <span>Skipped -</span>
                </div>
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-l-2 border-gray-100">
                  <div className="border-b border-dashed border-gray-200 w-full h-[33.3%]" />
                  <div className="border-b border-dashed border-gray-200 w-full h-[33.3%]" />
                  <div className="w-full h-[33.3%]" />
                </div>
                {questions.slice(0, 30).map((q, i) => {
                  let color = "#cbd5e1";
                  let height = "33.3%";
                  if (q.isCorrect === true) {
                    color = "#4ade80";
                    height = "100%";
                  } else if (
                    q.isCorrect === false &&
                    q.userAnswer &&
                    !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0)
                  ) {
                    color = "#fb7185";
                    height = "66.6%";
                  }
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col justify-end items-center relative z-10 h-full group"
                    >
                      <div
                        className="w-full max-w-[24px] rounded-sm transition-all hover:brightness-95"
                        style={{ backgroundColor: color, height }}
                      />
                      <div className="absolute -bottom-8 text-[12px] font-bold text-gray-400">
                        {i % 2 === 0 ? i + 1 : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        {courseId && (
          <div className="mt-16 mb-20">
            <LeaderboardPanel courseId={courseId} testId={testId} />
          </div>
        )}

        {/* Solution & Review — with per-question Report button */}
        {showQuestions && selectedAttempt?.questionBreakdown && (
          <div className="rounded-[12px] bg-white p-8 shadow-sm border border-gray-100 mt-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
              <h2 className="text-[24px] font-bold text-[#111827]">Solution &amp; Review</h2>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-[12px] font-semibold text-orange-600 border border-orange-100">
                <Flag className="h-3.5 w-3.5" />
                Think the answer is wrong? Click &quot;Report&quot; below the question.
              </div>
            </div>

            <div className="space-y-8">
              {selectedAttempt.questionBreakdown.map((q, i) => {
                const isReported = reportedIds.has(q.id);
                return (
                  <div key={q.id}>
                    <QuestionCard
                      question={{
                        id: q.id,
                        type: q.type as QuestionData["type"],
                        category: q.category,
                        prompt: q.prompt,
                        options: q.options,
                        points: q.points,
                      }}
                      questionNumber={i + 1}
                      totalQuestions={selectedAttempt.questionBreakdown!.length}
                      selectedAnswer={q.userAnswer}
                      onAnswer={() => {}}
                      showResult
                      correctAnswer={q.correctAnswer}
                      explanation={q.explanation}
                      explanationImageUrl={q.explanationImageUrl}
                      watermark={watermark}
                    />

                    {/* Report button row */}
                    <div className="mt-3 flex justify-end">
                      {isReported ? (
                        <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-[13px] font-semibold text-green-600 border border-green-100">
                          <CheckCircle2 className="h-4 w-4" />
                          Report submitted — admin will review this
                        </div>
                      ) : (
                        <button
                          className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-[13px] font-semibold text-orange-600 hover:bg-orange-100 transition-colors"
                          onClick={() =>
                            setReportTarget({
                              questionIndex: i,
                              questionId: q.id,
                              prompt: q.prompt,
                            })
                          }
                        >
                          <Flag className="h-3.5 w-3.5" />
                          Report this Question
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {reportTarget && (
          <ReportModal
            key="report-modal"
            target={reportTarget}
            testTitle={data.test.title}
            onClose={() => setReportTarget(null)}
            onSuccess={(questionId) => {
              setReportedIds((prev) => new Set([...prev, questionId]));
              setReportTarget(null);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
