"use client";

import { useEffect, useState } from "react";
import { m as motion } from "motion/react";
import { CircleCheck, FileQuestion, TriangleAlert } from "lucide-react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { formatRelativeTime } from "@/lib/date-format";
import type { AnswerCount, QuestionFlag, QuestionReport, TestReport } from "@/lib/question-stats";
import { AnalyticsTabs } from "../_components/analytics-tabs";

const SEVERITY_STYLES: Record<QuestionFlag["severity"], string> = {
  3: "bg-red-100 text-red-700",
  2: "bg-amber-100 text-amber-800",
  1: "bg-slate-100 text-slate-600",
};

const TYPE_LABELS: Record<string, string> = {
  SCQ: "Single choice",
  MCQ: "Multiple choice",
  NUMERIC: "Numerical",
  SKETCH: "Sketch",
};

function separationLabel(d: number | null): { text: string; className: string } {
  if (d === null) return { text: "—", className: "text-[#94a3b8]" };
  if (d < 0) return { text: "Negative", className: "text-red-600" };
  if (d < 0.15) return { text: "Weak", className: "text-amber-600" };
  if (d < 0.3) return { text: "Fair", className: "text-[#101828]" };
  return { text: "Good", className: "text-[#16a34a]" };
}

function AnswerBars({ counts, answered }: { counts: AnswerCount[]; answered: number }) {
  if (counts.length === 0 || answered === 0) return null;
  return (
    <div className="mt-4 space-y-1.5">
      {counts.map((row) => {
        const share = Math.round((row.count / answered) * 100);
        return (
          <div key={row.answer ?? "\u0000other"} className="flex items-center gap-3 text-[12px]">
            <span className={`w-40 shrink-0 truncate ${row.isCorrect ? "font-semibold text-[#16a34a]" : "text-[#475569]"}`} title={row.answer ?? undefined}>
              {row.answer ?? "Other answers"}
              {row.isCorrect && " ✓"}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${row.isCorrect ? "bg-[#16a34a]" : row.answer === null ? "bg-amber-400" : "bg-[#94a3b8]"}`} style={{ width: `${share}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right tabular-nums text-[#64748b]">{row.count} ({share}%)</span>
          </div>
        );
      })}
    </div>
  );
}

function QuestionRow({ q, index }: { q: QuestionReport; index: number }) {
  const separation = separationLabel(q.discrimination);
  const worst = q.flags[0]?.severity;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 10) * 0.04 }}
      className={`rounded-[16px] border px-5 py-4 ${worst === 3 ? "border-red-200 bg-red-50/40" : worst === 2 ? "border-amber-200 bg-amber-50/40" : "border-gray-100 bg-gray-50/30"}`}
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-[13px] font-bold text-white">Q{q.number}</span>
          <div className="min-w-0">
            <p className="line-clamp-2 font-semibold text-[#101828]">{q.prompt.trim() || "Image question"}</p>
            <p className="text-[12px] text-[#94a3b8]">{TYPE_LABELS[q.type] ?? q.type}</p>
          </div>
          {q.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.imageUrl} alt={`Question ${q.number}`} className="h-14 w-20 shrink-0 rounded-lg border border-gray-100 bg-white object-contain" />
          )}
        </div>
        <div className="flex items-center gap-6 text-[13px]">
          <div className="text-center" title="Average share of the marks students got">
            <div className="font-bold text-[#101828]">{q.difficulty === null ? "—" : `${Math.round(q.difficulty * 100)}%`}</div>
            <div className="text-[#94a3b8]">Avg. marks</div>
          </div>
          <div className="text-center" title="Do the strongest students do better on it than the weakest? Needs enough students.">
            <div className={`font-bold ${separation.className}`}>{separation.text}</div>
            <div className="text-[#94a3b8]">Separation</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-[#101828]">{q.answeredCount}/{q.studentCount}</div>
            <div className="text-[#94a3b8]">Answered</div>
          </div>
        </div>
      </div>

      {q.flags.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {q.flags.map((flag) => (
            <li key={flag.code} className="flex flex-wrap items-baseline gap-2 text-[13px]">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${SEVERITY_STYLES[flag.severity]}`}>{flag.label}</span>
              <span className="text-[#475569]">{flag.advice}</span>
            </li>
          ))}
        </ul>
      )}
      {q.pendingCount > 0 && (
        <p className="mt-2 text-[12px] text-[#64748b]">{q.pendingCount} sketch answer{q.pendingCount === 1 ? "" : "s"} not graded yet, so not counted.</p>
      )}
      <AnswerBars counts={q.answerCounts} answered={q.answeredCount} />
    </motion.div>
  );
}

export default function TeacherQuestionAnalysisPage() {
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [tests, setTests] = useState<TestReport[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetch("/api/teacher/courses")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.length > 0) {
          setCourses(json.data);
          setSelectedCourse(json.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!selectedCourse) return;
    queueMicrotask(() => {
      setLoading(true);
      setFailed(false);
    });

    fetch(`/api/teacher/question-stats/${selectedCourse}`)
      .then((r) => r.json())
      .then((json) => {
        if (ignore) return;
        if (json.success) setTests(json.data.tests);
        else setFailed(true);
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedCourse]);

  const flaggedTotal = tests?.reduce((sum, t) => sum + t.flaggedCount, 0) ?? 0;

  return (
    <PageTransition>
      <div className="mx-auto grid max-w-[1920px] gap-8 px-0 pb-16 lg:gap-0">
        <section className="px-4 py-5 sm:px-6 sm:py-6 lg:px-[38px] lg:py-[18px]">
          <div className="mx-auto max-w-[1200px] space-y-8">
            <RevealSection>
              <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#7c3aed] to-[#38c1ff] px-8 py-10 text-white shadow-[0_20px_50px_rgba(124,58,237,0.25)]">
                <motion.div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 5, repeat: Infinity }} />
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
                  <div>
                    <AnalyticsTabs />
                    <h1 className="mt-4 text-[32px] font-semibold tracking-tight">Question Analysis</h1>
                    {tests && (
                      <p className="mt-2 text-white/80">
                        {flaggedTotal === 0
                          ? `No questions need a look across ${tests.length} test${tests.length === 1 ? "" : "s"}.`
                          : `${flaggedTotal} question${flaggedTotal === 1 ? "" : "s"} to check across ${tests.length} test${tests.length === 1 ? "" : "s"}.`}
                      </p>
                    )}
                  </div>
                  {courses.length > 0 && (
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      aria-label="Course"
                      className="cursor-pointer rounded-[14px] bg-white/20 px-4 py-2.5 text-sm font-semibold text-white outline-none backdrop-blur-sm"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id} className="text-black">{c.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </RevealSection>

            <div className="flex flex-col gap-3 rounded-[20px] bg-white px-6 py-4 text-[13px] text-[#475569] shadow-[0px_4px_12px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center sm:justify-between">
              <p>
                Updated every night from each student&apos;s <strong>first</strong> attempt. Questions get flags once 20 students have answered them.
              </p>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setShowAll(false)} className={`rounded-full px-4 py-1.5 font-semibold ${!showAll ? "bg-[#7c3aed] text-white" : "bg-gray-100 text-gray-600"}`}>
                  Needs a look
                </button>
                <button onClick={() => setShowAll(true)} className={`rounded-full px-4 py-1.5 font-semibold ${showAll ? "bg-[#7c3aed] text-white" : "bg-gray-100 text-gray-600"}`}>
                  All questions
                </button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-[24px] bg-white" />)}</div>
            ) : failed ? (
              <p className="rounded-[24px] bg-white py-12 text-center text-[#94a3b8]">Couldn&apos;t load the question analysis. Try again in a moment.</p>
            ) : !tests || tests.length === 0 ? (
              <div className="rounded-[24px] bg-white px-6 py-12 text-center shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
                <FileQuestion className="mx-auto h-8 w-8 text-[#94a3b8]" />
                <p className="mt-3 text-[#64748b]">No analysis yet. It appears the night after students submit a test in this course.</p>
              </div>
            ) : (
              tests.map((test) => {
                const shown = showAll ? test.questions : test.questions.filter((q) => q.flags.length > 0);
                return (
                  <div key={test.testId} className="rounded-[24px] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
                    <div className="flex flex-col gap-2 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-[18px] font-semibold text-[#101828]">{test.title}</h2>
                        <p className="text-[12px] text-[#94a3b8]">
                          {test.studentCount} student{test.studentCount === 1 ? "" : "s"} · {test.questions.length} questions · updated {formatRelativeTime(test.computedAt)}
                        </p>
                      </div>
                      {test.flaggedCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-amber-100 px-3 py-1 text-[12px] font-semibold text-amber-800 sm:self-auto">
                          <TriangleAlert className="h-3.5 w-3.5" /> {test.flaggedCount} to check
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-green-100 px-3 py-1 text-[12px] font-semibold text-green-700 sm:self-auto">
                          <CircleCheck className="h-3.5 w-3.5" /> Looks fine
                        </span>
                      )}
                    </div>
                    <div className="space-y-3 p-6">
                      {shown.length === 0 ? (
                        <p className="py-4 text-center text-[#94a3b8]">Nothing flagged in this test.</p>
                      ) : (
                        shown.map((q, i) => <QuestionRow key={q.questionId} q={q} index={i} />)
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
