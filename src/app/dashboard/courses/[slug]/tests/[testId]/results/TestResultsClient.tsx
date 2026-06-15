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

  const isPending =
    selectedAttempt?.questionBreakdown?.some((q) => q.isCorrect === null && q.points > 0) ?? false;

  const totalQuestions = data.test.totalQuestions;
  const questions = selectedAttempt?.questionBreakdown ?? [];
  const correctCount = questions.filter(q => q.isCorrect === true).length;
  const incorrectCount = questions.filter(q => q.isCorrect === false && q.userAnswer).length;
  const skippedCount = questions.filter(q => !q.userAnswer || (Array.isArray(q.userAnswer) && q.userAnswer.length === 0)).length;

  const correctMarks = questions.filter(q => q.isCorrect === true).reduce((sum, q) => sum + q.pointsAwarded, 0);
  const incorrectMarks = questions.filter(q => q.isCorrect === false && q.userAnswer && !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0)).reduce((sum, q) => sum + q.points, 0); 
  const negativeMarking = questions.filter(q => q.isCorrect === false && q.userAnswer && !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0)).reduce((sum, q) => sum + (q.negativeMarks || 0), 0);
  const skippedMarks = questions.filter(q => !q.userAnswer || (Array.isArray(q.userAnswer) && q.userAnswer.length === 0)).reduce((sum, q) => sum + q.points, 0);

  const accuracy = totalQuestions > 0 ? Math.round((correctCount / (totalQuestions - skippedCount)) * 100) || 0 : 0;
  const percentage = data.test.totalQuestions > 0 ? selectedAttempt.score : 0;
  
  const correctPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const incorrectPct = totalQuestions > 0 ? Math.round((incorrectCount / totalQuestions) * 100) : 0;
  const skippedPct = totalQuestions > 0 ? 100 - correctPct - incorrectPct : 0;
  
  // Section Analysis
  const sectionTypes = [
    { type: "NUMERIC", label: "NAT" },
    { type: "MCQ", label: "MSQ" },
    { type: "SCQ", label: "MCQ" },
    { type: "SKETCH", label: "Part B (DST)" },
  ];
  const sections = sectionTypes.map(sec => {
    const secQuestions = questions.filter(q => q.type === sec.type);
    const secTotal = secQuestions.reduce((sum, q) => sum + q.points, 0);
    const secEarned = secQuestions.reduce((sum, q) => sum + q.pointsAwarded, 0);
    const secCorrect = secQuestions.filter(q => q.isCorrect === true).length;
    const secAttempted = secQuestions.filter(q => q.userAnswer && !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0)).length;
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
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" className="text-gray-500 hover:text-gray-900 -ml-4" onClick={() => router.push(`/dashboard/courses/${slug}/tests`)}>
            ← Back to Tests
          </Button>
        </div>
        
        <h1 className="text-[28px] font-bold text-[#111827] mb-8">{data.test.title}</h1>

        {/* Top Overview Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
          {/* Your Score Card */}
          <div className="rounded-[12px] bg-white p-8 shadow-sm border border-gray-100 flex flex-col justify-center items-center">
            <h2 className="text-[20px] font-bold text-gray-800 mb-6 w-full text-center">Your Score</h2>
            <div className="text-center mb-8">
              <span className="text-5xl font-bold text-gray-900">{selectedAttempt.pointsEarned}</span>
              <div className="text-[18px] font-semibold text-gray-400 mt-2">out of {selectedAttempt.totalPoints}</div>
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
            <h2 className="text-[16px] font-semibold text-gray-800 mb-10">Total Marks <span className="font-bold">{selectedAttempt.totalPoints}</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <div className="flex flex-col items-center">
                <div className="w-[110px] h-[110px] rounded-full border-[3px] border-[#f1f5f9] flex items-center justify-center mb-4">
                  <span className="text-[28px] font-medium text-gray-900">{correctMarks}</span>
                </div>
                <span className="text-[15px] font-bold text-[#1e293b]">Correct</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-[110px] h-[110px] rounded-full border-[3px] border-[#f1f5f9] flex items-center justify-center mb-4">
                  <span className="text-[28px] font-medium text-gray-900">{incorrectMarks}</span>
                </div>
                <span className="text-[15px] font-bold text-[#1e293b]">Incorrect</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-[110px] h-[110px] rounded-full border-[3px] border-[#f1f5f9] flex items-center justify-center mb-4">
                  <span className="text-[28px] font-medium text-gray-900">{negativeMarking}</span>
                </div>
                <span className="text-[15px] font-bold text-[#1e293b]">Negative Marking</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-[110px] h-[110px] rounded-full border-[4px] border-gray-300 flex items-center justify-center mb-4">
                  <span className="text-[28px] font-medium text-gray-600">-{skippedMarks}</span>
                </div>
                <span className="text-[15px] font-bold text-[#1e293b]">Skipped</span>
              </div>
            </div>
            <p className="text-[15px] text-gray-600 leading-relaxed font-medium">
              You have scored <span className="font-bold text-gray-900">{correctMarks} marks</span> for correct answers, missed <span className="font-bold text-gray-900">{incorrectMarks} marks</span> on incorrect answers, lost <span className="font-bold text-gray-900">{negativeMarking} marks</span> due to negative marking and <span className="font-bold text-gray-900">{skippedMarks} marks</span> by skipping questions.
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
            {sections.map(sec => (
              <div key={sec.type} className="bg-white rounded-[12px] shadow-sm border border-gray-100 p-8 flex flex-col items-center">
                <h3 className="text-[18px] font-bold text-[#1e293b] mb-8">{sec.label}</h3>
                <div className="text-center mb-10">
                  <span className="text-[36px] font-medium text-[#fb7185]">{sec.earned}</span>
                  <div className="text-[18px] font-medium text-[#94a3b8] mt-1">out of {sec.total}</div>
                </div>
                <div className="w-full space-y-4 border-t border-gray-100 pt-6">
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-[#334155] font-bold">Percentile</span>
                    <span className="text-gray-900 font-bold">N/A</span>
                  </div>
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-[#334155] font-bold">Accuracy</span>
                    <span className="text-gray-900 font-bold">{sec.accuracy}%</span>
                  </div>
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-[#334155] font-bold">Percentage</span>
                    <span className="text-gray-900 font-bold">{sec.percentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question Report */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[24px] font-bold text-[#1e293b]">Question Report</h2>
            <button className="text-[14px] font-bold text-[#1e293b] flex items-center gap-1">
              View Report <span className="text-xl">→</span>
            </button>
          </div>
          <div className="bg-white rounded-[12px] shadow-sm border border-gray-100 p-8 flex flex-wrap justify-between items-center text-center gap-4">
            <div className="flex-1 min-w-[80px]">
              <div className="text-[32px] font-medium text-[#1e293b] mb-2">{totalQuestions}</div>
              <div className="text-[16px] font-semibold text-[#94a3b8]">Questions</div>
            </div>
            <div className="flex-1 min-w-[80px]">
              <div className="text-[32px] font-medium text-[#4ade80] mb-2">{correctCount}</div>
              <div className="text-[16px] font-semibold text-[#94a3b8]">Correct</div>
            </div>
            <div className="flex-1 min-w-[80px]">
              <div className="text-[32px] font-medium text-[#fb7185] mb-2">{incorrectCount}</div>
              <div className="text-[16px] font-semibold text-[#94a3b8]">Incorrect</div>
            </div>
            <div className="flex-1 min-w-[80px]">
              <div className="text-[32px] font-medium text-[#1e293b] mb-2">{skippedCount}</div>
              <div className="text-[16px] font-semibold text-[#94a3b8]">Skipped</div>
            </div>
            <div className="flex-1 min-w-[80px]">
              <div className="text-[32px] font-medium text-[#1e293b] mb-2">{selectedAttempt.score}</div>
              <div className="text-[16px] font-semibold text-[#94a3b8]">Score</div>
            </div>
            <div className="flex-1 min-w-[120px] border-l border-gray-100 pl-4">
              <div className="text-[32px] font-medium text-[#1e293b] mb-2">
                {selectedAttempt.timeSpentSecs ? `${Math.floor(selectedAttempt.timeSpentSecs / 60)}m ${selectedAttempt.timeSpentSecs % 60}s` : "—"}
              </div>
              <div className="text-[16px] font-semibold text-[#94a3b8]">Time<br/>Taken</div>
            </div>
          </div>
        </div>

        {/* How did you perform? */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[24px] font-bold text-[#1e293b]">How did you perform?</h2>
            <button className="text-[14px] font-bold text-[#1e293b] flex items-center gap-1">
              View Report <span className="text-xl">→</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2.5fr] gap-6">
            <div className="bg-white rounded-[12px] shadow-sm border border-gray-100 p-8 flex flex-col items-center">
              <h3 className="text-[18px] font-bold text-[#1e293b] mb-8 w-full text-center">Question Breakdown</h3>
              <div 
                className="w-48 h-48 rounded-full mb-6 flex items-center justify-center relative"
                style={{
                  background: `conic-gradient(
                    #4ade80 0% ${correctPct}%, 
                    #fb7185 ${correctPct}% ${correctPct + incorrectPct}%, 
                    #cbd5e1 ${correctPct + incorrectPct}% 100%
                  )`
                }}
              >
                <div className="w-36 h-36 bg-white rounded-full flex flex-col items-center justify-center z-10 shadow-inner">
                  <div className="text-[24px] font-bold text-[#1e293b] mb-0.5">
                    {selectedAttempt.timeSpentSecs ? `${Math.floor(selectedAttempt.timeSpentSecs / 60)}m ${selectedAttempt.timeSpentSecs % 60}s` : "—"}
                  </div>
                  <div className="text-[12px] font-semibold text-[#64748b] text-center leading-tight">Total Time<br/>Spent</div>
                </div>
              </div>
              <div className="w-full space-y-4 text-sm mt-4">
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-[#64748b] font-semibold">Correct Answers</span>
                  <span className="text-[#4ade80] font-bold">{correctPct}%</span>
                </div>
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-[#64748b] font-semibold">Incorrect Answers</span>
                  <span className="text-[#fb7185] font-bold">{incorrectPct}%</span>
                </div>
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-[#64748b] font-semibold">Skipped</span>
                  <span className="text-[#cbd5e1] font-bold">{skippedPct}%</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-[12px] shadow-sm border border-gray-100 p-8">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-[18px] font-bold text-[#1e293b]">Score Analysis</h3>
                <span className="text-[15px] font-semibold text-[#64748b]">Total Questions <span className="text-[#1e293b] ml-1">{totalQuestions}</span></span>
              </div>
              <div className="flex items-center gap-6 mb-12 text-[14px] font-semibold">
                <span className="text-[#1e293b]">Attempts</span>
                <div className="flex gap-5 ml-auto">
                  <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded bg-[#4ade80]"></div>Correct {correctCount}</div>
                  <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded bg-[#fb7185]"></div>Incorrect {incorrectCount}</div>
                  <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded bg-[#cbd5e1]"></div>Skipped {skippedCount}</div>
                </div>
              </div>
              
              <div className="h-[280px] w-full border-b-2 border-l-2 border-gray-100 flex items-end pl-2 gap-2 relative mt-10">
                  {/* Y axis labels */}
                  <div className="absolute left-[-70px] top-0 bottom-0 flex flex-col justify-between text-[12px] font-semibold text-gray-500 py-4">
                     <span>Correct -</span>
                     <span>Incorrect -</span>
                     <span>Skipped -</span>
                  </div>
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-l-2 border-gray-100">
                     <div className="border-b border-dashed border-gray-200 w-full h-[33.3%]"></div>
                     <div className="border-b border-dashed border-gray-200 w-full h-[33.3%]"></div>
                     <div className="w-full h-[33.3%]"></div>
                  </div>
                  {/* X axis lines / Questions */}
                  {questions.slice(0, 30).map((q, i) => {
                     let color = "#cbd5e1"; // Skipped
                     let height = "33.3%"; // Skipped
                     if (q.isCorrect === true) { color = "#4ade80"; height = "100%"; }
                     else if (q.isCorrect === false && q.userAnswer && !(Array.isArray(q.userAnswer) && q.userAnswer.length === 0)) { color = "#fb7185"; height = "66.6%"; }

                     return (
                        <div key={i} className="flex-1 flex flex-col justify-end items-center relative z-10 h-full group">
                           <div className="w-full max-w-[24px] rounded-sm transition-all hover:brightness-95" style={{ backgroundColor: color, height }}></div>
                           <div className="absolute -bottom-8 text-[12px] font-bold text-gray-400">{i%2===0 ? i+1 : ''}</div>
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

        {/* Per-question breakdown (Toggled) */}
        {showQuestions && selectedAttempt?.questionBreakdown && (
          <div className="rounded-[12px] bg-white p-8 shadow-sm border border-gray-100 mt-8">
            <h2 className="mb-8 text-[24px] font-bold text-[#111827]">Solution & Review</h2>
            <div className="space-y-6">
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
                    explanationImageUrl={q.explanationImageUrl}
                    watermark={watermark}
                  />
                );
              })}
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
}

