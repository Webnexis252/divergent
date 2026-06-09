"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { User as UserIcon, CheckCircle2, AlertTriangle, Trophy, Clock } from "lucide-react";
import { CategoryPerformancePanel } from "@/app/dashboard/_components/test-taking/category-performance-panel";
import { QuestionCard, type QuestionWatermark } from "@/app/dashboard/_components/test-taking/question-card";
import { SectionNavigator, type SectionTab } from "@/app/dashboard/_components/test-taking/section-navigator";
import { LeaderboardPanel } from "@/app/dashboard/_components/test-taking/leaderboard-panel";
import { buildCategoryPerformanceBreakdown } from "@/lib/test-category-performance";

// ─── Types ─────────────────────────────────────────────────────────────────────

type QuestionStatus = "NOT_VISITED" | "NOT_ANSWERED" | "ANSWERED" | "MARKED_FOR_REVIEW" | "ANSWERED_AND_MARKED";

type Question = {
  id: string; type: string; category: string; prompt: string; options: any;
  correctAnswer: any; imageUrl: string | null; points: number; negativeMarks: number;
  allowPartialMarking: boolean; explanation: string | null; groupId: string | null;
};
type Group = { id: string; title: string | null; content: string | null; imageUrl: string | null; };
type Section = { id: string; title: string; questionType: string; groups: Group[]; questions: Question[]; };
type Part = { id: string; title: string; durationMins: number | null; sections: Section[]; };

type GradeResult = {
  attemptId: string; score: number; pointsEarned: number; totalPoints: number; isPassed: boolean;
  gradingStatus: "AUTO_GRADED" | "PENDING_REVIEW" | "FULLY_GRADED" | "PARTIAL_A_GRADED";
  passingScore: number;
  questionResults?: Record<string, { type: string; isCorrect: boolean | null; pointsAwarded: number; correctAnswer?: unknown; explanation?: string | null }>;
};

type ExamClientProps = {
  exam: { id: string; title: string; durationMins: number; courseTitle: string; courseId: string };
  parts: Part[];
  studentName: string; studentEmail: string; studentPhone: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  if (seconds === Infinity) return "No Limit";
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

function ResultsScreen({ result, parts, answers, watermark, courseId, testId }: any) {
  const router = useRouter();
  const isPending = result.gradingStatus === "PENDING_REVIEW" || result.gradingStatus === "PARTIAL_A_GRADED";

  // Flatten questions to compute breakdown
  const allQuestions = parts.flatMap((p: any) => p.sections.flatMap((s: any) => s.questions));
  
  const categoryBreakdown = result.questionResults ? buildCategoryPerformanceBreakdown(
    allQuestions.map((q: any) => ({
      category: q.category, points: q.points,
      pointsAwarded: result.questionResults?.[q.id]?.pointsAwarded,
      isCorrect: result.questionResults?.[q.id]?.isCorrect,
    }))
  ) : [];

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex min-h-screen flex-col items-center justify-start bg-[#f5f6f8] px-4 py-12">
      <div className="w-full max-w-3xl space-y-6">
        <div className={`rounded-[28px] px-8 py-10 text-center text-white shadow-xl ${result.isPassed ? "bg-gradient-to-br from-[#22c55e] to-[#16a34a]" : isPending ? "bg-gradient-to-br from-[#f59e0b] to-[#d97706]" : "bg-gradient-to-br from-[#38c1ff] to-[#0077ff]"}`}>
          <div className="text-6xl font-bold">{result.score}%</div>
          <div className="mt-2 text-xl font-semibold opacity-90">{isPending ? "Provisional Score" : result.isPassed ? "You Passed! 🎉" : "Keep Going! 💪"}</div>
          <div className="mt-1 text-base opacity-75">{result.pointsEarned} / {result.totalPoints} points earned</div>
        </div>

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
            <CategoryPerformancePanel items={categoryBreakdown} description="Your exam score grouped by the tags attached to each question." />
          </div>
        )}

        <div className="rounded-[20px] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-[#f59e0b]" />
            <h2 className="text-[18px] font-semibold text-[#111827]">Leaderboard</h2>
          </div>
          <LeaderboardPanel courseId={courseId} testId={testId} />
        </div>

        <button onClick={() => router.push(`/dashboard/courses`)} className="w-full rounded-[14px] bg-[#38c1ff] py-4 text-[16px] font-bold text-white shadow-lg transition hover:bg-[#0ea5e9]">
          Back to Courses
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main ExamClient ───────────────────────────────────────────────────────────

export function ExamClient({ exam, parts, studentName, studentEmail, studentPhone }: ExamClientProps) {
  const router = useRouter();

  // Validate state
  if (!parts || parts.length === 0) {
    return <div className="p-10 text-center">No parts configured for this exam.</div>;
  }

  // ── State ──
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // within section
  
  const [answers, setAnswers] = useState<Record<string, unknown>>({}); // keyed by q.id
  const [statuses, setStatuses] = useState<Record<string, QuestionStatus>>({}); // keyed by q.id
  
  const currentPart = parts[currentPartIndex];
  
  const [partTimeLeft, setPartTimeLeft] = useState(currentPart?.durationMins ? currentPart.durationMins * 60 : Infinity);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);

  // Helper to flat map questions for a section
  const getSectionQuestions = (section: Section) => {
    // We assume questions in groups are also in section.questions OR we need to combine them.
    // Based on schema, questions belong to section OR group. The API returns section.questions and section.groups[].questions.
    const directQs = section.questions || [];
    const groupQs = (section.groups || []).flatMap(g => g.questions || []);
    return [...directQs, ...groupQs];
  };

  const currentSection = currentPart?.sections[currentSectionIndex];
  const sectionQuestions = currentSection ? getSectionQuestions(currentSection) : [];
  const currentQ = sectionQuestions[currentQuestionIndex];

  // Initialize status on mount
  useEffect(() => {
    if (currentQ && !statuses[currentQ.id]) {
      setStatuses(prev => ({ ...prev, [currentQ.id]: "NOT_ANSWERED" }));
    }
  }, [currentQ, statuses]);

  // ── Timer ──
  useEffect(() => {
    if (result || isSubmitting) return;
    if (partTimeLeft <= 0) {
      handlePartEnd();
      return;
    }
    if (partTimeLeft === Infinity) return; // No time limit

    const timer = setInterval(() => {
      setPartTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [partTimeLeft, result, isSubmitting]);

  const handlePartEnd = () => {
    if (currentPartIndex < parts.length - 1) {
      // Move to next part
      const nextPart = parts[currentPartIndex + 1];
      setCurrentPartIndex(currentPartIndex + 1);
      setCurrentSectionIndex(0);
      setCurrentQuestionIndex(0);
      setPartTimeLeft(nextPart.durationMins ? nextPart.durationMins * 60 : Infinity);
    } else {
      // End of exam
      void handleFullSubmit();
    }
  };

  // ── Handlers ──
  const handleAnswer = useCallback((questionId: string, answer: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleSaveAndNext = () => {
    if (!currentQ) return;
    const answered = isAnswered(answers[currentQ.id], currentQ.type);
    setStatuses((prev) => ({ ...prev, [currentQ.id]: answered ? "ANSWERED" : "NOT_ANSWERED" }));

    if (currentQuestionIndex < sectionQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentSectionIndex < currentPart.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentQuestionIndex(0);
    } else {
       handlePartEnd();
    }
  };

  const handleMarkReview = () => {
    if (!currentQ) return;
    const answered = isAnswered(answers[currentQ.id], currentQ.type);
    setStatuses((prev) => ({ ...prev, [currentQ.id]: answered ? "ANSWERED_AND_MARKED" : "MARKED_FOR_REVIEW" }));
    
    if (currentQuestionIndex < sectionQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleClear = () => {
    if (!currentQ) return;
    setAnswers((prev) => { const n = { ...prev }; delete n[currentQ.id]; return n; });
    setStatuses((prev) => ({ ...prev, [currentQ.id]: "NOT_ANSWERED" }));
  };

  const handleFullSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/courses/${exam.courseId}/tests/${exam.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
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

  if (!currentQ) {
    return <div className="p-10 text-center text-gray-500">No questions found in this section.</div>;
  }

  const watermark: QuestionWatermark = { name: studentName, email: studentEmail, phone: studentPhone };
  const urgentTime = partTimeLeft !== Infinity && partTimeLeft < 300;
  
  // Find Group info
  const parentGroup = currentQ.groupId ? currentSection.groups?.find(g => g.id === currentQ.groupId) : null;

  if (result) {
    return <ResultsScreen result={result} parts={parts} answers={answers} watermark={watermark} courseId={exam.courseId} testId={exam.id} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f6f8] font-sans">
      <header className="flex h-16 shrink-0 items-center bg-white shadow-sm">
        <div className="flex w-[240px] shrink-0 items-center gap-2 px-6">
          <div className="grid grid-cols-2 gap-1">
            <div className="h-2 w-2 rounded-full bg-[#38bdf8]" />
            <div className="h-2 w-2 rounded-full bg-[#facc15]" />
            <div className="h-2 w-2 rounded-full bg-[#38bdf8]" />
            <div className="h-2 w-2 rounded-full bg-[#facc15]" />
          </div>
          <span className="font-bold leading-tight text-[#374151]">Divergent <br /> Classes</span>
        </div>
        <div className="flex h-full flex-1 items-center justify-between bg-[#38bdf8] px-8 text-white">
          <div>
            <h1 className="text-[20px] font-bold tracking-wide uppercase">{exam.title}</h1>
            <div className="flex items-center gap-3 text-[12px] text-white/80">
              <span className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-white/20">
                {currentPart.title}
              </span>
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
                  {partTimeLeft !== Infinity && (
                    <>
                      {urgentTime && "⚠️ "}Time left:{" "}
                      <span className={`font-bold ${urgentTime ? "text-red-200" : "text-[#facc15]"}`}>
                        {formatTime(partTimeLeft)}
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-[240px] shrink-0 flex-col rounded-br-[40px] bg-[#facc15] py-8 shadow-[4px_0_24px_rgba(250,204,21,0.3)]">
          <nav className="flex flex-col gap-1 px-4">
            {[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Courses", href: "/dashboard/courses" },
            ].map((item) => (
              <button key={item.href} onClick={() => router.push(item.href)} className="flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium text-[#111827] transition hover:bg-white/20">
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex flex-1 flex-col overflow-y-auto px-6 py-6 lg:px-8">
          {submitError && (
            <div className="mb-4 flex items-center gap-2 rounded-[12px] bg-red-50 px-4 py-3 text-[14px] text-red-700 border border-red-200">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {submitError}
            </div>
          )}

          {/* Section Tabs */}
          <div className="mb-5 flex gap-2 border-b pb-3">
            {currentPart.sections.map((sec, idx) => (
              <button 
                key={sec.id}
                onClick={() => {
                  setCurrentSectionIndex(idx);
                  setCurrentQuestionIndex(0);
                }}
                className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
                  idx === currentSectionIndex ? "bg-white text-blue-600 border-t border-x shadow-sm -mb-3 pb-4" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {sec.title}
              </button>
            ))}
          </div>

          {/* Group Context (if any) */}
          {parentGroup && (
             <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
               <h3 className="text-purple-900 font-bold mb-2">{parentGroup.title || "Context Information"}</h3>
               {parentGroup.content && <p className="text-purple-800 text-sm whitespace-pre-wrap leading-relaxed">{parentGroup.content}</p>}
             </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={currentQ.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.18 }}>
              {/* @ts-ignore */}
              <QuestionCard
                question={currentQ}
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={sectionQuestions.length}
                selectedAnswer={answers[currentQ.id]}
                onAnswer={(ans: any) => handleAnswer(currentQ.id, ans)}
                isFlagged={statuses[currentQ.id] === "MARKED_FOR_REVIEW" || statuses[currentQ.id] === "ANSWERED_AND_MARKED"}
                onToggleFlag={handleMarkReview}
                watermark={watermark}
              />
            </motion.div>
          </AnimatePresence>

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

          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-3">
              <button onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))} disabled={currentQuestionIndex === 0} className="rounded-[10px] border border-gray-200 bg-white px-5 py-2 text-[13px] font-semibold text-[#374151] shadow-sm disabled:opacity-40">
                ← Back
              </button>
              <button onClick={() => setCurrentQuestionIndex(Math.min(sectionQuestions.length - 1, currentQuestionIndex + 1))} disabled={currentQuestionIndex === sectionQuestions.length - 1} className="rounded-[10px] border border-gray-200 bg-white px-5 py-2 text-[13px] font-semibold text-[#374151] shadow-sm disabled:opacity-40">
                Next →
              </button>
            </div>
            
            <button
              onClick={() => { if (window.confirm("Submit this part? You cannot change answers in this part afterwards.")) handlePartEnd(); }}
              className="flex items-center gap-2 rounded-[10px] bg-[#22c55e] px-7 py-2.5 text-[14px] font-bold text-white shadow transition hover:bg-[#16a34a]"
            >
              <CheckCircle2 className="h-4 w-4" />
              {currentPartIndex === parts.length - 1 ? "FINISH EXAM" : "SUBMIT PART"}
            </button>
          </div>
        </main>

        <aside className="flex w-[300px] shrink-0 flex-col border-l border-gray-100 bg-white p-5 shadow-[-4px_0_16px_rgba(0,0,0,0.03)] overflow-y-auto">
          <div className="mt-2">
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <p className="text-[12px] font-bold uppercase tracking-wider text-gray-700">{currentSection.title}</p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {sectionQuestions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => {
                    if (!statuses[q.id]) setStatuses(prev => ({ ...prev, [q.id]: "NOT_VISITED" }));
                    setCurrentQuestionIndex(i);
                  }}
                  className={`flex h-9 w-full items-center justify-center rounded-[8px] border text-[13px] font-medium shadow-sm transition-colors ${statusColor[statuses[q.id] ?? "NOT_VISITED"]} ${currentQuestionIndex === i ? "ring-2 ring-[#38c1ff] ring-offset-1" : ""}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
