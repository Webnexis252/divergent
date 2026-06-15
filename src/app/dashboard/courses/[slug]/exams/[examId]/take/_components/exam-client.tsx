"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Flag, Clock, CheckCircle2, ChevronRight, ChevronLeft, Image as ImageIcon } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type QuestionStatus = "NOT_VISITED" | "NOT_ANSWERED" | "ANSWERED" | "MARKED_FOR_REVIEW" | "ANSWERED_AND_MARKED";

type Question = {
  id: string; type: any; category: any; prompt: string; options: any;
  correctAnswer: any; imageUrl: string | null; points: number; negativeMarks: number;
  allowPartialMarking: boolean; explanation: string | null; groupId: string | null;
};
type Group = { id: string; title: string | null; content: string | null; imageUrl: string | null; questions?: Question[]; };
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
  if (seconds === Infinity) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function isAnswered(answer: unknown, type: string): boolean {
  if (type === "MCQ") return Array.isArray(answer) && (answer as unknown[]).length > 0;
  if (type === "SKETCH") return typeof answer === "string" && answer.startsWith("data:");
  return typeof answer === "string" && answer.trim() !== "";
}

// ─── Instructions Page ─────────────────────────────────────────────────────────

function InstructionsPage({
  exam,
  parts,
  onStart,
}: {
  exam: ExamClientProps["exam"];
  parts: Part[];
  onStart: () => void;
}) {
  const totalQuestions = parts.flatMap(p => p.sections.flatMap(s => {
    const dqs = s.questions || [];
    const gqs = (s.groups || []).flatMap(g => g.questions || []);
    return [...dqs, ...gqs];
  })).length;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col md:flex-row gap-6 p-6 font-sans">
      {/* Left Dark Column */}
      <div className="flex flex-1 flex-col justify-between rounded-[32px] bg-[#1a2538] p-10 text-white shadow-xl relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[11px] font-bold tracking-widest text-white/80 uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            Assessment Workspace
          </div>
          <p className="text-[13px] font-medium tracking-widest text-white/60 uppercase mb-2">{exam.courseTitle}</p>
          <h1 className="text-6xl font-black tracking-tight mb-6">{exam.title}</h1>
          <p className="text-white/70 text-[15px] mb-12 max-w-md leading-relaxed">
            This assessment is timed, structured, and designed to reward calm, complete work.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[20px] bg-white/5 p-5 border border-white/10">
              <div className="mb-3 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-300" />
              </div>
              <p className="text-[11px] font-bold tracking-widest text-white/50 uppercase">Duration</p>
              <p className="text-2xl font-bold mt-1">{exam.durationMins} min</p>
            </div>
            <div className="rounded-[20px] bg-white/5 p-5 border border-white/10">
              <div className="mb-3 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="h-1.5 w-1.5 bg-blue-300 rounded-sm" /><div className="h-1.5 w-1.5 bg-blue-300 rounded-sm" />
                  <div className="h-1.5 w-1.5 bg-blue-300 rounded-sm" /><div className="h-1.5 w-1.5 bg-blue-300 rounded-sm" />
                </div>
              </div>
              <p className="text-[11px] font-bold tracking-widest text-white/50 uppercase">Questions</p>
              <p className="text-2xl font-bold mt-1">{totalQuestions}</p>
            </div>
            <div className="rounded-[20px] bg-white/5 p-5 border border-white/10">
              <div className="mb-3 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full border-2 border-blue-300 flex items-center justify-center"><div className="h-1.5 w-1.5 rounded-full bg-blue-300" /></div>
              </div>
              <p className="text-[11px] font-bold tracking-widest text-white/50 uppercase">Pass Target</p>
              <p className="text-2xl font-bold mt-1">50%</p>
            </div>
            <div className="rounded-[20px] bg-white/5 p-5 border border-white/10">
              <div className="mb-3 h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-blue-300" />
              </div>
              <p className="text-[11px] font-bold tracking-widest text-white/50 uppercase">Attempts</p>
              <p className="text-2xl font-bold mt-1">1 attempt left</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Light Column */}
      <div className="flex flex-1 flex-col justify-between rounded-[32px] bg-[#f8fafc] p-10 shadow-sm border border-gray-100">
        <div>
          <div className="mb-6 inline-block rounded-full bg-blue-100 px-4 py-1.5 text-[11px] font-bold tracking-widest text-blue-800 uppercase">
            Before You Start
          </div>
          <h2 className="text-4xl font-black text-[#0f172a] leading-[1.1] tracking-tight mb-10">
            Set yourself up for one<br/>calm, complete run.
          </h2>

          <div className="space-y-4">
            <div className="flex gap-5 rounded-[20px] bg-white p-6 shadow-sm border border-gray-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-black text-gray-900">01</div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Timer starts immediately</h3>
                <p className="mt-1.5 text-[14px] text-gray-500 leading-relaxed">Once you begin, the countdown continues until you submit or time runs out.</p>
              </div>
            </div>
            <div className="flex gap-5 rounded-[20px] bg-white p-6 shadow-sm border border-gray-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-black text-gray-900">02</div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Use the navigator as you go</h3>
                <p className="mt-1.5 text-[14px] text-gray-500 leading-relaxed">Jump between questions, flag the uncertain ones, and come back before you submit.</p>
              </div>
            </div>
            <div className="flex gap-5 rounded-[20px] bg-white p-6 shadow-sm border border-gray-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-black text-gray-900">03</div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Stay on a stable connection</h3>
                <p className="mt-1.5 text-[14px] text-gray-500 leading-relaxed">Your attempt is tracked continuously, but the smoothest run is still the safest run.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className="rounded-[20px] bg-gray-200/50 p-5 mb-6">
            <p className="text-sm text-gray-600 leading-relaxed">This paper is built for focused work: answer steadily, review deliberately, and finish cleanly.</p>
          </div>
          <button
            onClick={onStart}
            className="w-full rounded-[16px] bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition"
          >
            START ASSESSMENT
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Results Screen ────────────────────────────────────────────────────────────

function ResultsScreen({ result, router }: any) {
  const isPending = result.gradingStatus === "PENDING_REVIEW" || result.gradingStatus === "PARTIAL_A_GRADED";
  return (
    <div className="mx-auto flex max-w-[800px] flex-col items-center justify-center p-10 text-center">
      <div className={`mb-8 flex h-32 w-32 items-center justify-center rounded-full ${result.isPassed ? "bg-green-100 text-green-600" : isPending ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>
        <CheckCircle2 className="h-16 w-16" />
      </div>
      <h1 className="mb-2 text-4xl font-black text-gray-900">
        {isPending ? "Assessment Submitted" : result.isPassed ? "You Passed!" : "Assessment Complete"}
      </h1>
      <p className="mb-10 text-lg text-gray-500">
        You scored <strong>{result.score}%</strong> ({result.pointsEarned} / {result.totalPoints} pts)
      </p>
      <button onClick={() => router.push("/dashboard/courses")} className="rounded-[16px] bg-[#1a2538] px-8 py-4 text-sm font-bold text-white hover:bg-[#0f172a] transition">
        Return to Dashboard
      </button>
    </div>
  );
}

// ─── Main Interface ────────────────────────────────────────────────────────────

export function ExamClient({ exam, parts, studentName, studentEmail, studentPhone }: ExamClientProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<"instructions" | "exam">("instructions");

  if (!parts || parts.length === 0) {
    return <div className="p-10 text-center">No parts configured for this exam.</div>;
  }

  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [statuses, setStatuses] = useState<Record<string, QuestionStatus>>({});

  const currentPart = parts[currentPartIndex];
  const [partTimeLeft, setPartTimeLeft] = useState(currentPart?.durationMins ? currentPart.durationMins * 60 : Infinity);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);

  const getSectionQuestions = (section: Section) => {
    const directQs = section.questions || [];
    const groupQs = (section.groups || []).flatMap(g => g.questions || []);
    return [...directQs, ...groupQs];
  };

  const currentSection = currentPart?.sections[currentSectionIndex];
  const sectionQuestions = currentSection ? getSectionQuestions(currentSection) : [];
  const currentQ = sectionQuestions[currentQuestionIndex];

  useEffect(() => {
    if (phase !== "exam" || result || isSubmitting) return;
    if (partTimeLeft <= 0) { handlePartEnd(); return; }
    if (partTimeLeft === Infinity) return;
    const timer = setInterval(() => setPartTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [partTimeLeft, result, isSubmitting, phase]);

  const handlePartEnd = () => {
    if (currentPartIndex < parts.length - 1) {
      const nextPart = parts[currentPartIndex + 1];
      setCurrentPartIndex(currentPartIndex + 1);
      setCurrentSectionIndex(0);
      setCurrentQuestionIndex(0);
      setPartTimeLeft(nextPart.durationMins ? nextPart.durationMins * 60 : Infinity);
    } else {
      void handleFullSubmit();
    }
  };

  const handleAnswer = (val: unknown) => {
    if (!currentQ) return;
    setAnswers(prev => ({ ...prev, [currentQ.id]: val }));
    setStatuses(prev => ({ ...prev, [currentQ.id]: isAnswered(val, currentQ.type) ? (prev[currentQ.id] === "MARKED_FOR_REVIEW" ? "ANSWERED_AND_MARKED" : "ANSWERED") : "NOT_ANSWERED" }));
  };

  const handleToggleFlag = () => {
    if (!currentQ) return;
    setStatuses(prev => {
      const current = prev[currentQ.id];
      const answered = isAnswered(answers[currentQ.id], currentQ.type);
      if (current === "MARKED_FOR_REVIEW" || current === "ANSWERED_AND_MARKED") {
        return { ...prev, [currentQ.id]: answered ? "ANSWERED" : "NOT_ANSWERED" };
      } else {
        return { ...prev, [currentQ.id]: answered ? "ANSWERED_AND_MARKED" : "MARKED_FOR_REVIEW" };
      }
    });
  };

  const handleFullSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${exam.courseId}/tests/${exam.id}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const json = await res.json();
      if (!json.success && !json.data) throw new Error(json.error || "Submission failed");
      setResult(json.data);
    } catch (err) {
      alert("Submission failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  const urgentTime = partTimeLeft !== Infinity && partTimeLeft < 300;
  const allSectionQs = sectionQuestions;
  const answeredCount = allSectionQs.filter(q => statuses[q.id] === "ANSWERED" || statuses[q.id] === "ANSWERED_AND_MARKED").length;
  const flaggedCount = allSectionQs.filter(q => statuses[q.id] === "MARKED_FOR_REVIEW" || statuses[q.id] === "ANSWERED_AND_MARKED").length;
  const progressPct = allSectionQs.length > 0 ? Math.round((answeredCount / allSectionQs.length) * 100) : 0;

  if (phase === "instructions") {
    return <InstructionsPage exam={exam} parts={parts} onStart={() => setPhase("exam")} />;
  }

  if (result) {
    return <ResultsScreen result={result} router={router} />;
  }

  return (
    <div className="mx-auto max-w-[1200px] p-6 font-sans">
      {/* ── HEADER BANNER ── */}
      <div className="relative mb-6 flex items-center justify-between rounded-[32px] bg-[#1a2538] p-8 text-white shadow-lg overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 flex flex-col justify-between h-full w-full">
          <div className="flex items-center gap-2 mb-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-widest text-white uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE ASSESSMENT
            </span>
          </div>

          <div className="flex items-end justify-between w-full">
            <div>
              <p className="text-[12px] font-medium tracking-widest text-white/60 uppercase mb-1">{exam.courseTitle}</p>
              <div className="flex items-center gap-4">
                <h1 className="text-5xl font-black tracking-tight">{exam.title}</h1>
                <span className="rounded-[8px] bg-white text-[#1a2538] px-3 py-1 text-[13px] font-bold">
                  {currentPart.title}
                </span>
              </div>
              <p className="text-white/70 text-[14px] mt-4">
                This assessment is timed, structured, and designed to reward calm, complete work.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-2 text-right">
                <div className="flex items-center justify-between gap-6 rounded-full bg-white/10 px-4 py-2">
                  <span className="text-[12px] text-white/70">Answered</span>
                  <span className="text-[14px] font-bold">{answeredCount}/{allSectionQs.length}</span>
                </div>
                <div className="flex items-center justify-between gap-6 rounded-full bg-white/10 px-4 py-2">
                  <span className="text-[12px] text-white/70">Flagged</span>
                  <span className="text-[14px] font-bold">{flaggedCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-full bg-white/10 p-2 pr-6 border border-white/5">
                {/* Circular timer graphic */}
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#1a2538] border-2 border-white/20">
                  {urgentTime ? (
                     <div className="absolute inset-0 rounded-full border-2 border-red-500 animate-pulse" />
                  ) : (
                     <svg className="absolute inset-0 h-full w-full -rotate-90">
                       <circle cx="26" cy="26" r="24" stroke="currentColor" strokeWidth="2" fill="none" className="text-orange-400" strokeDasharray={`${Math.max(0.1, (partTimeLeft / (currentPart.durationMins! * 60)) * 150)} 150`} />
                     </svg>
                  )}
                  <div className={`h-2.5 w-2.5 rounded-full ${urgentTime ? 'bg-red-500 animate-pulse' : 'bg-orange-400'}`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-2xl font-black ${urgentTime ? "text-red-400" : "text-white"}`}>{formatTime(partTimeLeft)}</span>
                  <span className="text-[10px] font-bold tracking-widest text-white/50 uppercase mt-[-2px]">
                    {Math.ceil(partTimeLeft / 60)} min left
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN TWO COLUMNS ── */}
      <div className="flex gap-6 relative">
        {/* LEFT COLUMN: Question */}
        <div className="flex-1">
          <div className="relative rounded-[24px] bg-white p-8 shadow-sm border border-gray-100 min-h-[500px]">
             {/* Watermark overlay */}
             <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[24px] select-none opacity-5">
               {[...Array(6)].map((_, i) => (
                 <div key={i} className="whitespace-nowrap text-[14px] font-bold tracking-[0.2em] text-gray-900" style={{ transform: `rotate(-25deg) translate(-20%, ${i * 120}px)` }}>
                   {studentName.toUpperCase()} • {studentEmail.toUpperCase()} • {studentName.toUpperCase()} • {studentEmail.toUpperCase()}
                 </div>
               ))}
             </div>

             {/* Header */}
             <div className="relative z-20 flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                 <span className="text-[15px] font-black text-blue-600">Q{currentQuestionIndex + 1}<span className="text-gray-400 font-medium">/{allSectionQs.length}</span></span>
                 {currentQ?.type === "SCQ" && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">Single Choice</span>}
                 {currentQ?.type === "MCQ" && <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-700">Multiple Choice</span>}
                 {currentQ?.category && <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-purple-700">{currentQ.category}</span>}
                 <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">{currentQ?.points} Pts</span>
               </div>
               <button onClick={handleToggleFlag} className={`text-gray-400 hover:text-gray-900 transition ${statuses[currentQ?.id || ""] === "MARKED_FOR_REVIEW" || statuses[currentQ?.id || ""] === "ANSWERED_AND_MARKED" ? "text-purple-600" : ""}`}>
                 <Flag className="h-5 w-5" fill={statuses[currentQ?.id || ""] === "MARKED_FOR_REVIEW" || statuses[currentQ?.id || ""] === "ANSWERED_AND_MARKED" ? "currentColor" : "none"} />
               </button>
             </div>

             {/* Question Content */}
             <div className="relative z-20">
               <p className="text-[17px] leading-relaxed text-gray-900 mb-6 font-medium">
                 {currentQ?.prompt}
               </p>
               {currentQ?.imageUrl && (
                 <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center p-4">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={currentQ.imageUrl} alt="Question figure" className="max-h-[300px] object-contain mix-blend-multiply" />
                 </div>
               )}

               {/* Options */}
               {currentQ && (currentQ.type === "SCQ" || currentQ.type === "MCQ") && (
                 <div className="flex flex-col gap-3">
                   {(currentQ.options as string[]).map((opt, i) => {
                     const isMulti = currentQ.type === "MCQ";
                     const selected = isMulti
                       ? Array.isArray(answers[currentQ.id]) && (answers[currentQ.id] as string[]).includes(opt)
                       : answers[currentQ.id] === opt;
                     return (
                       <button
                         key={i}
                         onClick={() => {
                           if (isMulti) {
                             const prev = Array.isArray(answers[currentQ.id]) ? (answers[currentQ.id] as string[]) : [];
                             handleAnswer(selected ? prev.filter(v => v !== opt) : [...prev, opt]);
                           } else {
                             handleAnswer(opt);
                           }
                         }}
                         className={`flex items-center gap-4 rounded-[16px] border-[1.5px] p-4 text-left transition-all ${
                           selected ? "border-blue-500 bg-blue-50/50" : "border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50"
                         }`}
                       >
                         <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                           selected ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300 bg-white"
                         }`}>
                           {selected && <CheckCircle2 className="h-4 w-4" />}
                         </div>
                         <span className={`text-[15px] ${selected ? "text-blue-900 font-medium" : "text-gray-700"}`}>{opt}</span>
                       </button>
                     );
                   })}
                 </div>
               )}
               
               {/* Controls */}
               <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6">
                 <button
                   onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                   disabled={currentQuestionIndex === 0}
                   className="flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                 >
                   <ChevronLeft className="h-4 w-4" /> Previous
                 </button>
                 {currentQuestionIndex === allSectionQs.length - 1 ? (
                   <button
                     onClick={() => { if (window.confirm("Submit the exam?")) handlePartEnd(); }}
                     className="rounded-full bg-green-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700"
                   >
                     Submit Assessment
                   </button>
                 ) : (
                   <button
                     onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                     className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                   >
                     Next <ChevronRight className="h-4 w-4" />
                   </button>
                 )}
               </div>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Question Map */}
        <div className="w-[300px] shrink-0">
          <div className="sticky top-6 rounded-[24px] bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[12px] font-bold tracking-widest text-gray-800 uppercase">Question Map</h3>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">{progressPct}%</span>
            </div>
            <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">Jump cleanly, answer steadily, review late.</p>

            {/* Progress bar */}
            <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 mb-8">
              <span>{answeredCount}/{allSectionQs.length} answered</span>
              <span>{allSectionQs.length - answeredCount} left</span>
            </div>

            {/* Map Grid */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              {allSectionQs.map((q, i) => {
                const s = statuses[q.id];
                const isCurrent = i === currentQuestionIndex;
                const isAns = s === "ANSWERED" || s === "ANSWERED_AND_MARKED";
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(i)}
                    className={`flex h-[42px] w-full items-center justify-center rounded-[12px] text-[13px] font-bold transition-all ${
                      isCurrent 
                        ? "bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]" 
                        : isAns 
                          ? "border-[2px] border-green-500 text-green-700 bg-green-50/50" 
                          : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[10px] font-medium uppercase tracking-widest text-gray-500">
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Current</div>
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border-[2px] border-green-500" /> Answered</div>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-medium uppercase tracking-widest text-gray-500 mt-2">
              <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full border border-gray-300" /> Unanswered</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
