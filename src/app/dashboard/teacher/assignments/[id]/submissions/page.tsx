"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Download,
  FileText,
  User,
  CheckCircle2,
  Clock3,
  Star,
  MessageSquare,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { TeacherSidebar } from "@/app/dashboard/_components/teacher-sidebar";
import { TeacherTopBar } from "@/app/dashboard/_components/teacher-top-bar";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { cx } from "@/lib/cx";

type Submission = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  content: string | null;
  fileUrl: string | null;
  score: number | null;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
};

type AssignmentInfo = {
  id: string;
  title: string;
  points: number;
  deadline: string | null;
  courseTitle: string;
};

function GradeModal({
  submission,
  maxPoints,
  onClose,
  onSave,
}: {
  submission: Submission;
  maxPoints: number;
  onClose: () => void;
  onSave: (submissionId: string, score: number, feedback: string) => Promise<void>;
}) {
  const [score, setScore] = useState(String(submission.score ?? ""));
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > maxPoints) return;
    setSaving(true);
    await onSave(submission.id, numScore, feedback);
    setSaving(false);
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-[500px] overflow-hidden rounded-[24px] bg-white shadow-[0_32px_80px_rgba(0,0,0,0.2)]"
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 20 }}
        initial={{ scale: 0.96, y: 20 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
      >
        <div className="border-b border-[#f0f0f0] px-7 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#f59e0b]">Grade Submission</p>
              <h3 className="mt-1 text-[18px] font-bold text-[#111827]">{submission.studentName}</h3>
              <p className="text-[13px] text-[#6b7280]">{submission.studentEmail}</p>
            </div>
            <button
              className="rounded-full p-1.5 text-[#9ca3af] transition-colors hover:bg-[#f3f4f6]"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-7 py-6">
          {/* Submission content preview */}
          {submission.content && (
            <div className="rounded-[14px] bg-[#f9fafb] px-4 py-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">Student Notes</p>
              <p className="text-[14px] leading-6 text-[#374151]">{submission.content}</p>
            </div>
          )}

          {submission.fileUrl && (
            <a
              href={submission.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-[14px] border border-[#bae6fd] bg-[#f0faff] px-4 py-3 text-[14px] font-medium text-[#0284c7] transition-colors hover:bg-[#e0f2fe]"
            >
              <Download className="h-4 w-4 shrink-0" />
              Download submitted file
            </a>
          )}

          {/* Score */}
          <div>
            <label className="text-[13px] font-semibold text-[#374151]">
              Score <span className="font-normal text-[#9ca3af]">/ {maxPoints}</span>
            </label>
            <input
              className="mt-2 w-full rounded-[12px] border border-[#e5e7eb] px-4 py-2.5 text-[15px] font-semibold text-[#111827] outline-none transition focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20"
              max={maxPoints}
              min={0}
              onChange={(e) => setScore(e.target.value)}
              placeholder={`0 – ${maxPoints}`}
              type="number"
              value={score}
            />
          </div>

          {/* Feedback */}
          <div>
            <label className="text-[13px] font-semibold text-[#374151]">Feedback</label>
            <textarea
              className="mt-2 w-full resize-none rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] text-[#374151] outline-none placeholder:text-[#9ca3af] transition focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20"
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Write constructive feedback for the student..."
              rows={4}
              value={feedback}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#f0f0f0] px-7 py-5">
          <button
            className="inline-flex h-10 items-center rounded-[12px] border border-[#e5e7eb] px-5 text-[13px] font-medium text-[#374151] transition-colors hover:bg-[#f9fafb]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#38c1ff] px-6 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(56,193,255,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            disabled={saving || score === ""}
            onClick={() => void handleSave()}
            type="button"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Grade
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function TeacherSubmissionsPage() {
  const params = useParams();
  const assignmentId = params.id as string;

  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/assignments/${assignmentId}/submissions`);
      const json = await res.json();
      if (json.success) {
        setAssignment(json.data.assignment);
        setSubmissions(json.data.submissions);
      } else {
        setError(json.message ?? "Failed to load submissions");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  async function handleGrade(submissionId: string, score: number, feedback: string) {
    try {
      const res = await fetch(`/api/teacher/assignments/${assignmentId}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, score, feedback }),
      });
      const json = await res.json();
      if (json.success) {
        setGradingSubmission(null);
        void loadData();
      }
    } catch {
      console.error("Failed to save grade");
    }
  }

  const graded = submissions.filter((s) => s.score !== null).length;
  const pending = submissions.length - graded;

  return (
    <div className="min-h-screen bg-[#f7f6f6] text-black">
      <PageTransition>
        <TeacherTopBar />

        <div className="mx-auto grid max-w-[1920px] gap-6 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:px-0 lg:pt-8">
          <TeacherSidebar />

          <main className="space-y-8 lg:pr-[160px]">
            {/* Back nav */}
            <Link
              href="/dashboard/teacher/assignments"
              className="inline-flex items-center gap-2 text-[14px] font-medium text-[#667085] transition-colors hover:text-[#111827]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Assignments
            </Link>

            {/* Header */}
            <RevealSection>
              <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-r from-[#0ea5e9] via-[#38bdf8] to-[#7dd3fc] px-6 py-10 text-white shadow-[0_24px_48px_rgba(14,165,233,0.28)] sm:px-8 lg:px-12 lg:py-12">
                <motion.div
                  className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/12 blur-3xl"
                  animate={{ scale: [1, 1.22, 1], opacity: [0.35, 0.6, 0.35] }}
                  transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="relative z-10">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/75">
                    {loading ? "Loading…" : assignment?.courseTitle}
                  </p>
                  <h1 className="mt-3 text-[clamp(1.6rem,3.5vw,2.6rem)] font-semibold leading-tight tracking-[-0.04em]">
                    {loading ? "Loading assignment…" : assignment?.title}
                  </h1>
                  <p className="mt-2 text-[14px] text-white/80">
                    {assignment?.points} points
                    {assignment?.deadline && (
                      <> · Due {new Date(assignment.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</>
                    )}
                  </p>
                </div>
              </section>
            </RevealSection>

            {/* Stats */}
            <StaggerGrid className="grid gap-5 sm:grid-cols-3">
              {[
                { label: "Total Submissions", value: loading ? "…" : String(submissions.length), icon: <User className="h-5 w-5" />, color: "text-[#0284c7]", bg: "bg-[#e0f2fe]" },
                { label: "Graded", value: loading ? "…" : String(graded), icon: <CheckCircle2 className="h-5 w-5" />, color: "text-[#15803d]", bg: "bg-[#dcfce7]" },
                { label: "Pending Review", value: loading ? "…" : String(pending), icon: <Clock3 className="h-5 w-5" />, color: "text-[#b45309]", bg: "bg-[#fef3c7]" },
              ].map((card, i) => (
                <motion.article
                  key={card.label}
                  className="rounded-[22px] border border-[#ededed] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                  whileHover={{ y: -4 }}
                >
                  <div className={cx("inline-flex h-10 w-10 items-center justify-center rounded-[12px]", card.bg, card.color)}>
                    {card.icon}
                  </div>
                  <p className="mt-4 text-[36px] font-semibold leading-none tracking-[-0.04em] text-[#101828]">{card.value}</p>
                  <p className="mt-2 text-[12px] font-medium text-[#667085]">{card.label}</p>
                </motion.article>
              ))}
            </StaggerGrid>

            {/* Submissions list */}
            <RevealSection>
              <section className="overflow-hidden rounded-[28px] border border-[#e8eaef] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <div className="border-b border-[#eef0f3] px-6 py-5">
                  <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">Student Submissions</h2>
                  <p className="mt-0.5 text-[13px] text-[#667085]">
                    {loading ? "Loading…" : `${submissions.length} submission${submissions.length !== 1 ? "s" : ""} received`}
                  </p>
                </div>

                <div className="p-5 space-y-3">
                  {loading ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="h-24 animate-pulse rounded-[18px] bg-[#f3f4f6]" />
                    ))
                  ) : error ? (
                    <div className="flex items-center gap-3 rounded-[18px] border border-dashed border-[#fca5a5] bg-[#fff5f5] px-5 py-10 text-[14px] text-[#dc2626]">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      {error}
                    </div>
                  ) : submissions.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-[#d7dbe2] bg-[#fafafa] px-5 py-16 text-center">
                      <FileText className="mx-auto h-10 w-10 text-[#d1d5db]" />
                      <p className="mt-4 text-[16px] font-semibold text-[#374151]">No submissions yet</p>
                      <p className="mt-2 text-[13px] text-[#9ca3af]">Students will appear here once they submit their work.</p>
                    </div>
                  ) : (
                    submissions.map((sub, i) => (
                      <motion.article
                        key={sub.id}
                        className="rounded-[18px] border border-[#eceef2] bg-[#fcfcfd] px-5 py-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.35 }}
                        whileHover={{ y: -3, boxShadow: "0 10px 24px rgba(15,23,42,0.07)" }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          {/* Student info */}
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e0f2fe] text-[#0284c7]">
                              <User className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-[#101828]">{sub.studentName}</p>
                              <p className="text-[12px] text-[#667085]">{sub.studentEmail}</p>
                            </div>
                          </div>

                          {/* Grade badge */}
                          <div className="flex items-center gap-2">
                            {sub.score !== null ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-3 py-1 text-[12px] font-bold text-[#15803d]">
                                <Star className="h-3.5 w-3.5" />
                                {sub.score}/{assignment?.points ?? 100}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1 text-[12px] font-semibold text-[#b45309]">
                                <Clock3 className="h-3.5 w-3.5" />
                                Pending
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Submission content preview */}
                        {sub.content && (
                          <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-[#4b5563]">
                            {sub.content}
                          </p>
                        )}

                        {/* Feedback preview */}
                        {sub.feedback && (
                          <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-[#f0fdf4] px-3 py-2.5">
                            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16a34a]" />
                            <p className="text-[12px] leading-5 text-[#15803d] line-clamp-1">{sub.feedback}</p>
                          </div>
                        )}

                        {/* Actions row */}
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <span className="text-[12px] text-[#9ca3af]">
                            Submitted {timeAgo(sub.submittedAt)}
                          </span>

                          {sub.fileUrl && (
                            <a
                              href={sub.fileUrl}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#e0f2fe] px-3 py-1 text-[12px] font-semibold text-[#0284c7] transition-colors hover:bg-[#bae6fd]"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Download File
                            </a>
                          )}

                          <button
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f9ff] px-3 py-1 text-[12px] font-semibold text-[#0369a1] transition-colors hover:bg-[#e0f2fe]"
                            onClick={() => setGradingSubmission(sub)}
                            type="button"
                          >
                            <Star className="h-3.5 w-3.5" />
                            {sub.score !== null ? "Update Grade" : "Grade"}
                          </button>
                        </div>
                      </motion.article>
                    ))
                  )}
                </div>
              </section>
            </RevealSection>
          </main>
        </div>

        <AnimatePresence>
          {gradingSubmission && assignment && (
            <GradeModal
              submission={gradingSubmission}
              maxPoints={assignment.points}
              onClose={() => setGradingSubmission(null)}
              onSave={handleGrade}
            />
          )}
        </AnimatePresence>
      </PageTransition>
    </div>
  );
}
