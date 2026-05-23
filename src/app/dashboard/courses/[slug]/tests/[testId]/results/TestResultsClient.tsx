"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Clock, Trophy } from "lucide-react";
import { CategoryPerformancePanel } from "@/app/dashboard/_components/test-taking/category-performance-panel";
import {
  QuestionCard,
  type QuestionData,
  type QuestionWatermark,
} from "@/app/dashboard/_components/test-taking/question-card";
import { LeaderboardPanel } from "@/app/dashboard/_components/test-taking/leaderboard-panel";
import { buildCategoryPerformanceBreakdown } from "@/lib/test-category-performance";
import { isPartAType } from "@/lib/test-question-sections";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  points: number;
  pointsAwarded: number;
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
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState(0);
  const [showQuestions, setShowQuestions] = useState(false);

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

  // If no attempts yet
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
            <Button variant="outline" onClick={() => router.push(`/dashboard/courses/${slug}/tests`)}>
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

  const isPending =
    selectedAttempt?.questionBreakdown?.some((q) => q.isCorrect === null && q.points > 0) ?? false;

  // Split questions for per-part display
  const partAQuestions = selectedAttempt?.questionBreakdown?.filter((q) => isPartAType(q.type)) ?? [];
  const partBQuestions = selectedAttempt?.questionBreakdown?.filter((q) => !isPartAType(q.type)) ?? [];

  const partAPoints = partAQuestions.reduce((sum, q) => sum + q.pointsAwarded, 0);
  const partATotal = partAQuestions.reduce((sum, q) => sum + q.points, 0);
  const partAScore = partATotal > 0 ? Math.round((partAPoints / partATotal) * 100) : 0;

  const partBPoints = partBQuestions.reduce((sum, q) => sum + q.pointsAwarded, 0);
  const partBTotal = partBQuestions.reduce((sum, q) => sum + q.points, 0);
  
  const hasPartB = partBQuestions.length > 0;
  const partBGraded = hasPartB
    ? partBQuestions.every((q) => q.isCorrect !== null)
    : false;

  const canShowQuestionDetails = Boolean(
    selectedAttempt?.questionBreakdown?.some(
      (question) => question.correctAnswer !== undefined || question.explanation !== null
    )
  );

  const categoryBreakdown = selectedAttempt?.questionBreakdown
    ? buildCategoryPerformanceBreakdown(
        selectedAttempt.questionBreakdown.map((question) => ({
          category: question.category,
          points: question.points,
          pointsAwarded: question.pointsAwarded,
          isCorrect: question.isCorrect,
        }))
      )
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex min-h-screen flex-col items-center justify-start bg-[#f5f6f8] px-4 py-8 sm:py-12"
    >
      <div className="w-full max-w-3xl space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" className="text-gray-500 hover:text-gray-900" onClick={() => router.push(`/dashboard/courses/${slug}/tests`)}>
            ← Back to Tests
          </Button>
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-900">{data.test.title}</h1>
            <p className="text-sm text-gray-500 capitalize">
              {data.test.type.replace("_", " ")} · {data.test.totalQuestions} Questions
            </p>
          </div>
        </div>

        {/* Overall Score Card */}
        <div className={`rounded-[28px] px-8 py-10 text-center text-white shadow-xl ${
          selectedAttempt.isPassed
            ? "bg-gradient-to-br from-[#22c55e] to-[#16a34a]"
            : isPending
              ? "bg-gradient-to-br from-[#f59e0b] to-[#d97706]"
              : "bg-gradient-to-br from-[#38c1ff] to-[#0077ff]"
        }`}>
          <div className="text-6xl font-bold">{selectedAttempt.score}%</div>
          <div className="mt-2 text-xl font-semibold opacity-90">
            {isPending ? "Provisional Score" : selectedAttempt.isPassed ? "You Passed! 🎉" : "Keep Going! 💪"}
          </div>
          <div className="mt-1 text-base opacity-75">
            {selectedAttempt.pointsEarned} / {selectedAttempt.totalPoints} points earned
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
            { label: "Score", value: `${selectedAttempt.score}%`, color: "text-[#38c1ff]" },
            { label: "Passing Score", value: `${data.test.passingScore}%`, color: "text-[#f59e0b]" },
            { label: "Status", value: isPending ? "Pending" : selectedAttempt.isPassed ? "Passed" : "Failed", color: selectedAttempt.isPassed ? "text-[#22c55e]" : isPending ? "text-[#f59e0b]" : "text-[#ef4444]" },
          ].map((s) => (
            <div key={s.label} className="rounded-[16px] bg-white px-4 py-4 text-center shadow-sm border border-gray-100">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="mt-1 text-[12px] text-[#9ca3af]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <div className="rounded-[20px] bg-white p-6 shadow-sm border border-gray-100">
            <CategoryPerformancePanel
              items={categoryBreakdown}
              description="Your exam score grouped by the tags attached to each question."
            />
          </div>
        )}

        {/* Leaderboard */}
        {courseId && (
          <div className="rounded-[20px] bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-[#f59e0b]" />
              <h2 className="text-[18px] font-semibold text-[#111827]">Leaderboard</h2>
            </div>
            <LeaderboardPanel courseId={courseId} testId={testId} />
          </div>
        )}

        {/* Attempt Selector (if multiple attempts) */}
        {data.attempts.length > 1 && (
          <div className="rounded-[20px] bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="mb-4 text-[14px] font-semibold uppercase tracking-wider text-gray-500">
              All Attempts
            </h3>
            <div className="flex flex-col gap-2">
              {data.attempts.map((attempt, i) => (
                <button
                  key={attempt.id}
                  className={`flex items-center gap-4 rounded-[12px] border-[1.5px] p-3 text-left transition-all ${
                    i === selectedAttemptIndex
                      ? "border-[#38c1ff] bg-[#38c1ff]/5"
                      : "border-gray-200 hover:border-[#38c1ff]"
                  }`}
                  onClick={() => { setSelectedAttemptIndex(i); setShowQuestions(false); }}
                >
                  <span className="text-sm font-semibold text-gray-500">#{data.attempts.length - i}</span>
                  <span className={`text-lg font-bold ${attempt.isPassed ? "text-[#4caf50]" : "text-[#ff3d00]"}`}>
                    {attempt.score}%
                  </span>
                  <Badge className={attempt.isPassed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} variant="outline">
                    {attempt.isPassed ? "Pass" : "Fail"}
                  </Badge>
                  <span className="ml-auto text-xs text-gray-500">
                    {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : "In Progress"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Question Details Toggle */}
        {canShowQuestionDetails && (
          <div className="text-center pt-4">
             <Button 
               variant="outline" 
               className="rounded-full px-6"
               onClick={() => setShowQuestions(!showQuestions)}
             >
               {showQuestions ? "Hide Question Review" : "Show Question Review"}
             </Button>
          </div>
        )}

        {/* Per-question breakdown */}
        {showQuestions && canShowQuestionDetails && selectedAttempt?.questionBreakdown && (
          <div className="rounded-[20px] bg-white p-6 shadow-sm border border-gray-100 mt-6">
            <h2 className="mb-6 text-[18px] font-semibold text-[#111827]">Question-by-Question Review</h2>
            <div className="space-y-4">
              {selectedAttempt.questionBreakdown.map((q, i) => {
                return (
                  <QuestionCard
                    key={q.id}
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
                    watermark={watermark}
                  />
                );
              })}
            </div>
          </div>
        )}

        {data.stats.canRetake && (
           <Button
             className="w-full rounded-[14px] bg-black py-6 text-[16px] font-bold text-white shadow-lg transition hover:bg-gray-800 mt-6"
             onClick={() => router.push(`/dashboard/courses/${slug}/tests/${testId}`)}
           >
             Retake Test
           </Button>
        )}
      </div>
    </motion.div>
  );
}
