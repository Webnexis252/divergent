"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import { TeacherSidebar } from "@/app/dashboard/_components/teacher-sidebar";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SketchQuestion = {
  questionId: string;
  prompt: string;
  referenceImage: string | null;
  maxPoints: number;
  studentAnswer: string | null;
  existingGrade: { points: number; feedback?: string } | null;
};

type ReviewItem = {
  attemptId: string;
  student: { id: string; name: string | null; email: string; image: string | null };
  exam: { id: string; title: string; courseTitle: string };
  submittedAt: string | null;
  provisionalScore: number;
  sketchQuestions: SketchQuestion[];
  totalSketchPoints: number;
};

// ─── Side-by-side sketch comparison ────────────────────────────────────────────

function SketchCompare({
  sketchQ,
  grade,
  onGradeChange,
}: {
  sketchQ: SketchQuestion;
  grade: { points: number; feedback: string };
  onGradeChange: (g: { points: number; feedback: string }) => void;
}) {
  const quickPointOptions = Array.from(
    new Set([0, Math.floor(sketchQ.maxPoints / 2), sketchQ.maxPoints])
  ).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <h3 className="text-[15px] font-semibold text-[#111827]">{sketchQ.prompt}</h3>

      {/* Side-by-side images */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Reference */}
        <div className="overflow-hidden rounded-[14px] border border-amber-200 bg-amber-50">
          <div className="border-b border-amber-200 bg-amber-100 px-4 py-2 text-[12px] font-semibold text-amber-800">
            📋 Reference (Admin&apos;s Answer Key)
          </div>
          {sketchQ.referenceImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sketchQ.referenceImage}
              alt="Reference sketch"
              className="max-h-[300px] w-full object-contain p-2"
            />
          ) : (
            <div className="flex h-[200px] items-center justify-center text-[13px] text-amber-600">
              No reference image uploaded
            </div>
          )}
        </div>

        {/* Student's answer */}
        <div className="overflow-hidden rounded-[14px] border border-[#38c1ff]/30 bg-blue-50">
          <div className="border-b border-[#38c1ff]/30 bg-blue-100/60 px-4 py-2 text-[12px] font-semibold text-blue-800">
            ✏️ Student&apos;s Submission
          </div>
          {sketchQ.studentAnswer ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sketchQ.studentAnswer}
              alt="Student sketch"
              className="max-h-[300px] w-full object-contain p-2"
            />
          ) : (
            <div className="flex h-[200px] items-center justify-center text-[13px] text-blue-600">
              No sketch submitted
            </div>
          )}
        </div>
      </div>

      {/* Grading controls */}
      <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-4 space-y-3">
        <div className="flex items-center gap-4">
          <label className="text-[13px] font-semibold text-[#374151] whitespace-nowrap">
            Points awarded:
          </label>
          <input
            type="number"
            min={0}
            max={sketchQ.maxPoints}
            value={grade.points}
            onChange={(e) => onGradeChange({ ...grade, points: Math.min(sketchQ.maxPoints, Math.max(0, parseInt(e.target.value) || 0)) })}
            className="w-24 rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[14px] font-bold text-center outline-none focus:border-[#38c1ff]"
          />
          <span className="text-[13px] text-[#9ca3af]">/ {sketchQ.maxPoints}</span>

          {/* Quick point buttons */}
          <div className="flex gap-1.5">
            {quickPointOptions.map((v) => (
              <button
                key={`quick-points-${sketchQ.questionId}-${v}`}
                type="button"
                onClick={() => onGradeChange({ ...grade, points: v })}
                className={`rounded-[8px] px-3 py-1.5 text-[12px] font-semibold transition ${grade.points === v ? "bg-[#38c1ff] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-semibold text-[#374151]">
            Feedback (optional)
          </label>
          <input
            value={grade.feedback}
            onChange={(e) => onGradeChange({ ...grade, feedback: e.target.value })}
            placeholder="e.g. Good proportions, but perspective needs work"
            className="w-full rounded-[10px] border border-[#e5e7eb] px-3 py-2 text-[14px] outline-none focus:border-[#38c1ff]"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ExamReviewPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [grades, setGrades] = useState<Record<string, { points: number; feedback: string }>>({});
  const [saving, setSaving] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teacher/exam-review")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setReviews(json.data.reviews);
          // Initialize grades from existing data
          const init: Record<string, { points: number; feedback: string }> = {};
          for (const item of json.data.reviews as ReviewItem[]) {
            for (const sq of item.sketchQuestions) {
              init[`${item.attemptId}::${sq.questionId}`] = {
                points: sq.existingGrade?.points ?? 0,
                feedback: sq.existingGrade?.feedback ?? "",
              };
            }
          }
          setGrades(init);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const current = reviews[currentIdx];

  const buildSketchGrades = (item: ReviewItem) => {
    const result: Record<string, { points: number; feedback?: string }> = {};
    for (const sq of item.sketchQuestions) {
      const g = grades[`${item.attemptId}::${sq.questionId}`];
      if (g) result[sq.questionId] = { points: g.points, feedback: g.feedback || undefined };
    }
    return result;
  };

  const handleSave = async (moveNext = false) => {
    if (!current) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/exam-review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: current.attemptId,
          sketchGrades: buildSketchGrades(current),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save");

      setSavedIds((prev) => new Set([...prev, current.attemptId]));

      // If fully graded, remove from local list
      if (json.data.gradingStatus === "FULLY_GRADED") {
        setReviews((prev) => prev.filter((r) => r.attemptId !== current.attemptId));
        setCurrentIdx((prev) => Math.max(0, prev - 1));
      } else if (moveNext && currentIdx < reviews.length - 1) {
        setCurrentIdx((prev) => prev + 1);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save grades");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto grid max-w-[1920px] lg:grid-cols-[280px_1fr]">
        <TeacherSidebar />
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#38c1ff]" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-[1920px] gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
      <TeacherSidebar />

      <main className="min-h-screen bg-[#f8fafc] px-3 py-5 sm:px-6 sm:py-8 lg:px-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">Sketch Review</h1>
          <p className="mt-1 text-[15px] text-[#6b7280]">
            Grade student sketch submissions side-by-side with the reference answer
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[#e5e7eb] py-20 text-center">
            <CheckCircle2 className="h-12 w-12 text-[#22c55e]" />
            <p className="mt-4 text-[18px] font-semibold text-[#111827]">All caught up!</p>
            <p className="mt-1 text-[14px] text-[#9ca3af]">No sketch submissions pending review</p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            {/* Main review panel */}
            <div className="space-y-6">
              {/* Progress */}
              <div className="flex items-center justify-between rounded-[16px] border border-[#e5e7eb] bg-white px-5 py-4">
                <div>
                  <p className="text-[13px] font-semibold text-[#374151]">{current?.student.name ?? current?.student.email}</p>
                  <p className="text-[12px] text-[#9ca3af]">
                    {current?.exam.title} · {current?.exam.courseTitle}
                    {current?.submittedAt && (
                      <> · <Clock className="inline h-3 w-3 mx-1" />{new Date(current.submittedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
                    disabled={currentIdx === 0}
                    className="rounded-[10px] border border-[#e5e7eb] p-2 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[13px] font-medium text-[#374151]">
                    {currentIdx + 1} / {reviews.length}
                  </span>
                  <button
                    onClick={() => setCurrentIdx((p) => Math.min(reviews.length - 1, p + 1))}
                    disabled={currentIdx === reviews.length - 1}
                    className="rounded-[10px] border border-[#e5e7eb] p-2 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-[12px] bg-red-50 border border-red-100 px-4 py-3 text-[13px] text-red-700">
                  {error}
                </div>
              )}

              {/* Sketch questions */}
              <AnimatePresence mode="wait">
                {current && (
                  <motion.div
                    key={current.attemptId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-6"
                  >
                    {current.sketchQuestions.map((sq) => (
                      <div key={sq.questionId} className="rounded-[20px] border border-[#e5e7eb] bg-white p-6 shadow-sm">
                        <SketchCompare
                          sketchQ={sq}
                          grade={grades[`${current.attemptId}::${sq.questionId}`] ?? { points: 0, feedback: "" }}
                          onGradeChange={(g) =>
                            setGrades((prev) => ({ ...prev, [`${current.attemptId}::${sq.questionId}`]: g }))
                          }
                        />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons */}
              <div className="flex items-center justify-between rounded-[16px] border border-[#e5e7eb] bg-white px-5 py-4">
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-[12px] border border-[#e5e7eb] bg-white px-5 py-2.5 text-[13px] font-semibold text-[#374151] transition hover:bg-gray-50 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Grades
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-[12px] bg-[#38c1ff] px-5 py-2.5 text-[13px] font-bold text-white shadow transition hover:bg-[#0ea5e9] disabled:opacity-60"
                >
                  Save & Next →
                </button>
              </div>
            </div>

            {/* Sidebar: queue */}
            <div className="space-y-3">
              <h3 className="px-1 text-[13px] font-semibold text-[#6b7280] uppercase tracking-wide">Review Queue</h3>
              {reviews.map((item, i) => (
                <button
                  key={item.attemptId}
                  onClick={() => setCurrentIdx(i)}
                  className={`flex w-full flex-col items-start rounded-[14px] border px-4 py-3 text-left transition ${i === currentIdx ? "border-[#38c1ff] bg-blue-50" : "border-[#e5e7eb] bg-white hover:bg-gray-50"}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <p className="flex-1 text-[13px] font-semibold text-[#111827] truncate">
                      {item.student.name ?? item.student.email}
                    </p>
                    {savedIds.has(item.attemptId) && (
                      <CheckCircle2 className="h-4 w-4 text-[#22c55e] shrink-0" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] text-[#9ca3af] truncate">{item.exam.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#9ca3af]">
                    {item.sketchQuestions.length} sketch{item.sketchQuestions.length !== 1 ? "es" : ""} · {item.totalSketchPoints} pts
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
