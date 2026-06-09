"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";
import {
  Search,
  Plus,
  Filter,
  Loader2,
  X,
  FileText,
  ChevronDown,
  CheckCircle2,
  Clock3,
  BookOpen,
  Trash2,
  Star,
  Download,
  User,
  MessageSquare,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Course = { id: string; title: string };

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  points: number;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  createdAt: string;
  attachmentUrl: string | null;
  course: { id: string; title: string } | null;
  submissions: { id: string; score: number | null }[];
};

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

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-[#ecfdf5] text-[#15803d]",
  DRAFT: "bg-[#f1f5f9] text-[#64748b]",
  CLOSED: "bg-[#fff1f2] text-[#dc2626]",
};

const ease = [0.25, 0.46, 0.45, 0.94] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateAssignmentModal({
  courses,
  onClose,
  onSuccess,
}: {
  courses: Course[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [points, setPoints] = useState("100");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF upload
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPdf = async (file: File) => {
    if (file.type !== "application/pdf") { setError("Only PDF files allowed"); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Max 10 MB"); return; }
    setError(null);
    setPdfFile(file);
    setUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => setUploadProgress((p) => Math.min(p + 12, 85)), 120);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/assignments", { method: "POST", body: fd });
      const json = await res.json();
      clearInterval(interval);
      if (json.success) { setUploadProgress(100); setAttachmentUrl(json.data.url); }
      else { setError(json.error ?? "Upload failed"); setPdfFile(null); setUploadProgress(0); }
    } catch {
      clearInterval(interval);
      setError("Upload failed");
      setPdfFile(null);
      setUploadProgress(0);
    } finally { setUploading(false); }
  };

  const removePdf = () => {
    setPdfFile(null); setAttachmentUrl(null); setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!title.trim() || !courseId) return;
    setError(null); setSubmitting(true);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          points: parseInt(points) || 100,
          courseId,
          attachmentUrl: attachmentUrl ?? undefined,
        }),
      });
      const json = await res.json();
      if (json.success || res.status === 201) {
        setSuccess(true);
        setTimeout(() => { onSuccess(); onClose(); }, 1400);
      } else {
        if (json.details?.fieldErrors) {
          const firstError = Object.values(json.details.fieldErrors).flat()[0];
          setError(typeof firstError === 'string' ? firstError : json.error);
        } else {
          setError(json.error ?? "Failed to create assignment");
        }
      }
    } catch { setError("Network error — please try again"); }
    finally { setSubmitting(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-[560px] max-h-[92vh] overflow-y-auto rounded-[28px] bg-white p-8 shadow-[0_28px_64px_rgba(0,0,0,0.22)]"
        animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, y: 24 }} initial={{ scale: 0.94, y: 24 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
      >
        {success ? (
          <div className="py-10 text-center">
            <motion.p className="text-[52px]" animate={{ scale: 1 }} initial={{ scale: 0 }} transition={{ type: "spring", stiffness: 260 }}>✅</motion.p>
            <p className="mt-4 text-[20px] font-semibold text-[#15803d]">Assignment created!</p>
            <p className="mt-2 text-[13px] text-[#6b7280]">All enrolled students will be notified.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex rounded-full bg-[#fff7ed] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ea580c]">
                  Admin · New Assignment
                </div>
                <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-black">Create Assignment</h3>
                <p className="mt-1 text-[13px] text-[#6b7280]">Choose any course — all enrolled students will see it.</p>
              </div>
              <button onClick={onClose} className="text-[22px] leading-none text-[#9ca3af] transition-colors hover:text-black">&times;</button>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {/* Course selector */}
              <div>
                <label className="text-[13px] font-medium text-[#374151]">Course <span className="text-[#ef4444]">*</span></label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="mt-1 w-full rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/20"
                >
                  {courses.length === 0 ? (
                    <option value="">No courses available</option>
                  ) : (
                    courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)
                  )}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-[13px] font-medium text-[#374151]">Title <span className="text-[#ef4444]">*</span></label>
                <input
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mid-term Project Submission"
                  className="mt-1 w-full rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/20"
                />
              </div>

              {/* Points + Deadline */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[13px] font-medium text-[#374151]">Points</label>
                  <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} min={0}
                    className="mt-1 w-full rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/20"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[13px] font-medium text-[#374151]">Deadline</label>
                  <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                    className="mt-1 w-full rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/20"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[13px] font-medium text-[#374151]">Instructions</label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add instructions or useful links..."
                  className="mt-1 w-full resize-none rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/20"
                />
              </div>

              {/* PDF Upload */}
              <div>
                <label className="text-[13px] font-medium text-[#374151]">Attachment <span className="font-normal text-[#9ca3af]">(PDF, max 10 MB)</span></label>
                {!pdfFile ? (
                  <motion.div
                    className={`mt-1 flex flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed px-6 py-7 cursor-pointer transition-colors ${dragOver ? "border-[#d97706] bg-[#fffbeb]" : "border-[#d1d5db] bg-[#f9fafb] hover:border-[#d97706] hover:bg-[#fffbeb]"}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) uploadPdf(e.dataTransfer.files[0]); }}
                    onClick={() => fileInputRef.current?.click()}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff7ed]">
                      <FileText className="h-5 w-5 text-[#d97706]" />
                    </div>
                    <p className="text-[13px] font-medium text-[#374151]">Drag & drop PDF here</p>
                    <p className="text-[12px] text-[#9ca3af]">or <span className="text-[#d97706] underline">browse files</span></p>
                    <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadPdf(e.target.files[0]); }} />
                  </motion.div>
                ) : (
                  <motion.div className="mt-1 rounded-[14px] border border-[#e5e7eb] bg-[#f9fafb] px-4 py-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#fee2e2]">
                        <FileText className="h-5 w-5 text-[#dc2626]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[#101828]">{pdfFile.name}</p>
                        <p className="text-[12px] text-[#667085]">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      {!uploading && (
                        <button onClick={removePdf} className="shrink-0 rounded-full p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151]">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
                      <motion.div className={`h-full rounded-full ${uploadProgress === 100 ? "bg-[#22c55e]" : "bg-[#d97706]"}`}
                        initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#9ca3af]">
                      {uploading ? `Uploading… ${uploadProgress}%` : uploadProgress === 100 ? "✓ Uploaded" : ""}
                    </p>
                  </motion.div>
                )}
              </div>

              {error && <p className="rounded-[10px] bg-[#fff5f5] px-4 py-2 text-[13px] text-[#dc2626]">⚠️ {error}</p>}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <motion.button
                onClick={handleSubmit}
                disabled={submitting || uploading || !title.trim() || !courseId}
                className="flex-1 rounded-[12px] bg-gradient-to-r from-[#d97706] to-[#f59e0b] py-3 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(217,119,6,0.28)] disabled:opacity-50"
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              >
                {submitting ? "Creating..." : uploading ? "Uploading PDF…" : "Post Assignment"}
              </motion.button>
              <button onClick={onClose} className="rounded-[12px] border border-[#e5e7eb] px-5 py-3 text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb]">
                Cancel
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Grade Modal ──────────────────────────────────────────────────────────────

function GradeModal({
  submission, maxPoints, onClose, onSave,
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
    const num = Number(score);
    if (isNaN(num) || num < 0 || num > maxPoints) return;
    setSaving(true);
    await onSave(submission.id, num, feedback);
    setSaving(false);
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-[500px] overflow-hidden rounded-[24px] bg-white shadow-[0_32px_80px_rgba(0,0,0,0.2)]"
        animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 20 }} initial={{ scale: 0.96, y: 20 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
      >
        <div className="border-b border-[#f0f0f0] px-7 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#d97706]">Grade Submission</p>
              <h3 className="mt-1 text-[18px] font-bold text-[#111827]">{submission.studentName}</h3>
              <p className="text-[13px] text-[#6b7280]">{submission.studentEmail}</p>
            </div>
            <button className="rounded-full p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6]" onClick={onClose} type="button">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-7 py-6">
          {submission.content && (
            <div className="rounded-[14px] bg-[#f9fafb] px-4 py-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">Student Notes</p>
              <p className="text-[14px] leading-6 text-[#374151]">{submission.content}</p>
            </div>
          )}
          {submission.fileUrl && (
            <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-[14px] border border-[#bae6fd] bg-[#f0faff] px-4 py-3 text-[14px] font-medium text-[#0284c7] hover:bg-[#e0f2fe]">
              <Download className="h-4 w-4 shrink-0" />
              Download submitted file
            </a>
          )}
          <div>
            <label className="text-[13px] font-semibold text-[#374151]">Score <span className="font-normal text-[#9ca3af]">/ {maxPoints}</span></label>
            <input className="mt-2 w-full rounded-[12px] border border-[#e5e7eb] px-4 py-2.5 text-[15px] font-semibold text-[#111827] outline-none transition focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/20"
              max={maxPoints} min={0} onChange={(e) => setScore(e.target.value)} placeholder={`0 – ${maxPoints}`} type="number" value={score} />
          </div>
          <div>
            <label className="text-[13px] font-semibold text-[#374151]">Feedback</label>
            <textarea className="mt-2 w-full resize-none rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] text-[#374151] outline-none placeholder:text-[#9ca3af] transition focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/20"
              onChange={(e) => setFeedback(e.target.value)} placeholder="Write constructive feedback..." rows={4} value={feedback} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#f0f0f0] px-7 py-5">
          <button className="inline-flex h-10 items-center rounded-[12px] border border-[#e5e7eb] px-5 text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb]" onClick={onClose} type="button">Cancel</button>
          <button className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#d97706] px-6 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(217,119,6,0.3)] hover:-translate-y-0.5 disabled:opacity-50 transition-transform"
            disabled={saving || score === ""} onClick={() => void handleSave()} type="button">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Grade
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Submissions Drawer ───────────────────────────────────────────────────────

function SubmissionsDrawer({
  assignment,
  onClose,
}: {
  assignment: Assignment;
  onClose: () => void;
}) {
  const [info, setInfo] = useState<AssignmentInfo | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teacher/assignments/${assignment.id}/submissions`);
      const json = await res.json();
      if (json.success) {
        setInfo(json.data.assignment);
        setSubmissions(json.data.submissions);
      } else {
        setError(json.message ?? "Failed to load submissions");
      }
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [assignment.id]);

  useEffect(() => { void loadSubmissions(); }, [loadSubmissions]);

  async function handleGrade(submissionId: string, score: number, feedback: string) {
    try {
      const res = await fetch(`/api/teacher/assignments/${assignment.id}/submissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, score, feedback }),
      });
      const json = await res.json();
      if (json.success) { setGradingSubmission(null); void loadSubmissions(); }
    } catch { console.error("Grade save failed"); }
  }

  const graded = submissions.filter((s) => s.score !== null).length;
  const pending = submissions.length - graded;

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="fixed right-0 top-0 z-50 h-screen w-full max-w-[640px] overflow-y-auto bg-white shadow-[−32px_0_80px_rgba(0,0,0,0.16)]"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
      >
        {/* Drawer header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#f0f0f0] bg-white px-7 py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d97706]">{assignment.course?.title ?? "Unknown Course"}</p>
            <h2 className="mt-1 text-[20px] font-bold tracking-[-0.03em] text-[#111827]">{assignment.title}</h2>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              {assignment.points} pts{assignment.deadline && ` · Due ${formatShortDate(assignment.deadline)}`}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 px-7 py-5 border-b border-[#f0f0f0]">
          {[
            { label: "Total", value: loading ? "…" : String(submissions.length), icon: <User className="h-4 w-4" />, color: "text-[#0284c7]", bg: "bg-[#e0f2fe]" },
            { label: "Graded", value: loading ? "…" : String(graded), icon: <CheckCircle2 className="h-4 w-4" />, color: "text-[#15803d]", bg: "bg-[#dcfce7]" },
            { label: "Pending", value: loading ? "…" : String(pending), icon: <Clock3 className="h-4 w-4" />, color: "text-[#b45309]", bg: "bg-[#fef3c7]" },
          ].map((c) => (
            <div key={c.label} className="rounded-[16px] border border-[#f0f0f0] bg-[#fafafa] px-4 py-3">
              <div className={`inline-flex h-8 w-8 items-center justify-center rounded-[10px] ${c.bg} ${c.color}`}>{c.icon}</div>
              <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.04em] text-[#111827]">{c.value}</p>
              <p className="mt-1 text-[12px] text-[#667085]">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Submissions list */}
        <div className="space-y-3 p-6">
          {loading ? (
            [1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-[18px] bg-[#f3f4f6]" />)
          ) : error ? (
            <div className="flex items-center gap-3 rounded-[18px] border border-dashed border-[#fca5a5] bg-[#fff5f5] px-5 py-10 text-[14px] text-[#dc2626]">
              <AlertCircle className="h-5 w-5 shrink-0" />{error}
            </div>
          ) : submissions.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-[#d7dbe2] bg-[#fafafa] px-5 py-16 text-center">
              <FileText className="mx-auto h-10 w-10 text-[#d1d5db]" />
              <p className="mt-4 text-[16px] font-semibold text-[#374151]">No submissions yet</p>
              <p className="mt-2 text-[13px] text-[#9ca3af]">Students will appear here once they submit.</p>
            </div>
          ) : (
            submissions.map((sub, i) => (
              <motion.article key={sub.id}
                className="rounded-[18px] border border-[#eceef2] bg-[#fcfcfd] px-5 py-4"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3, ease }}
                whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(15,23,42,0.07)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e0f2fe] text-[#0284c7]">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#101828]">{sub.studentName}</p>
                      <p className="text-[12px] text-[#667085]">{sub.studentEmail}</p>
                    </div>
                  </div>
                  {sub.score !== null ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-3 py-1 text-[12px] font-bold text-[#15803d]">
                      <Star className="h-3.5 w-3.5" />{sub.score}/{info?.points ?? assignment.points}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1 text-[12px] font-semibold text-[#b45309]">
                      <Clock3 className="h-3.5 w-3.5" />Pending
                    </span>
                  )}
                </div>

                {sub.content && <p className="mt-3 line-clamp-2 text-[13px] leading-6 text-[#4b5563]">{sub.content}</p>}
                {sub.feedback && (
                  <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-[#f0fdf4] px-3 py-2.5">
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16a34a]" />
                    <p className="text-[12px] leading-5 text-[#15803d] line-clamp-1">{sub.feedback}</p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="text-[12px] text-[#9ca3af]">Submitted {timeAgo(sub.submittedAt)}</span>
                  {sub.fileUrl && (
                    <a href={sub.fileUrl} download target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#e0f2fe] px-3 py-1 text-[12px] font-semibold text-[#0284c7] hover:bg-[#bae6fd]">
                      <Download className="h-3.5 w-3.5" />Download File
                    </a>
                  )}
                  <button
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7ed] px-3 py-1 text-[12px] font-semibold text-[#d97706] hover:bg-[#fed7aa]"
                    onClick={() => setGradingSubmission(sub)} type="button"
                  >
                    <Star className="h-3.5 w-3.5" />
                    {sub.score !== null ? "Update Grade" : "Grade"}
                  </button>
                </div>
              </motion.article>
            ))
          )}
        </div>
      </motion.aside>

      <AnimatePresence>
        {gradingSubmission && (
          <GradeModal
            submission={gradingSubmission}
            maxPoints={info?.points ?? assignment.points}
            onClose={() => setGradingSubmission(null)}
            onSave={handleGrade}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Delete confirm mini-modal ────────────────────────────────────────────────

function DeleteConfirmModal({
  assignmentTitle,
  onConfirm,
  onClose,
  deleting,
}: {
  assignmentTitle: string;
  onConfirm: () => void;
  onClose: () => void;
  deleting: boolean;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      animate={{ opacity: 1 }} exit={{ opacity: 0 }} initial={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-[400px] rounded-[24px] bg-white p-7 shadow-[0_28px_64px_rgba(0,0,0,0.2)]"
        animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }} initial={{ scale: 0.95, y: 16 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fee2e2]">
          <Trash2 className="h-5 w-5 text-[#dc2626]" />
        </div>
        <h3 className="mt-4 text-[18px] font-bold text-[#111827]">Delete Assignment?</h3>
        <p className="mt-2 text-[14px] text-[#6b7280]">
          &quot;<span className="font-semibold text-[#374151]">{assignmentTitle}</span>&quot; and all its submissions will be permanently deleted. This cannot be undone.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-[12px] border border-[#e5e7eb] py-2.5 text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb]">Cancel</button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#dc2626] py-2.5 text-[14px] font-semibold text-white hover:bg-[#b91c1c] disabled:opacity-60">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals / drawers
  const [showCreate, setShowCreate] = useState(false);
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<Assignment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (courseFilter !== "all") params.set("courseId", courseFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);

    Promise.all([
      fetch(`/api/admin/assignments?${params}`).then((r) => r.json()),
      fetch("/api/teacher/analytics/filters").then((r) => r.json()),
    ])
      .then(([aJson, fJson]) => {
        if (aJson.success) setAssignments(aJson.data?.assignments ?? []);
        else setError(aJson.error ?? "Failed to load assignments");
        if (fJson.success) {
          const all = fJson.data.courses as { id: string; title: string }[];
          setCourses(all);
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [courseFilter, statusFilter, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleStatusChange(assignment: Assignment, newStatus: "DRAFT" | "ACTIVE" | "CLOSED") {
    try {
      await fetch("/api/admin/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: assignment.id, status: newStatus }),
      });
      fetchData();
    } catch { console.error("Status update failed"); }
  }

  async function handleDelete() {
    if (!deletingAssignment) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/admin/assignments?assignmentId=${deletingAssignment.id}`, { method: "DELETE" });
      setDeletingAssignment(null);
      fetchData();
    } catch { console.error("Delete failed"); }
    finally { setIsDeleting(false); }
  }

  const totalSubs = assignments.reduce((s, a) => s + (a.submissions?.length ?? 0), 0);
  const graded = assignments.reduce((s, a) => s + (a.submissions?.filter((x) => x.score !== null).length ?? 0), 0);
  const active = assignments.filter((a) => a.status === "ACTIVE").length;
  const draft = assignments.filter((a) => a.status === "DRAFT").length;

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">

        {/* ── Hero ── */}
        <RevealSection>
          <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] px-8 py-10 text-white shadow-[0_24px_60px_rgba(217,119,6,0.28)]">
            <motion.div
              className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-3xl"
              animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 4.5, repeat: Infinity }}
            />
            <motion.div
              className="pointer-events-none absolute -bottom-8 left-1/2 h-36 w-36 rounded-full bg-white/8 blur-2xl"
              animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }}
            />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em]">
                  Admin Control
                </div>
                <h1 className="mt-4 text-[clamp(2rem,5vw,3.8rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
                  Assignments
                </h1>
                <p className="mt-3 max-w-[520px] text-[15px] leading-7 text-white/88">
                  Create, assign, and monitor assignments across all courses. Track submissions and grade student work from one place.
                </p>
              </div>
              <motion.button
                onClick={() => setShowCreate(true)}
                className="mt-2 shrink-0 inline-flex items-center gap-2 rounded-[16px] bg-white px-6 py-3 text-[14px] font-semibold text-[#b45309] shadow-[0_8px_24px_rgba(0,0,0,0.14)] transition hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
              >
                <Plus className="h-4 w-4" />
                New Assignment
              </motion.button>
            </div>
          </section>
        </RevealSection>

        {/* ── Stat cards ── */}
        <StaggerGrid className="grid grid-cols-2 gap-5 md:grid-cols-4">
          <AdminStatCard index={0} title="Total" value={loading ? "…" : assignments.length} caption="All assignments in system." tone="sky" />
          <AdminStatCard index={1} title="Active" value={loading ? "…" : active} caption="Currently accepting submissions." tone="emerald" />
          <AdminStatCard index={2} title="Submissions" value={loading ? "…" : totalSubs} caption={`${graded} graded`} tone="amber" />
          <AdminStatCard index={3} title="Drafts" value={loading ? "…" : draft} caption="Not yet published." tone="slate" />
        </StaggerGrid>

        {/* ── Filter bar ── */}
        <RevealSection>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assignments…"
                className="h-11 w-full rounded-[12px] border border-[#e5e7eb] bg-white pl-10 pr-4 text-[14px] text-[#111827] placeholder:text-[#9ca3af] outline-none transition focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/20"
              />
            </div>

            {/* Course filter */}
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
              <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}
                className="h-11 appearance-none rounded-[12px] border border-[#e5e7eb] bg-white pl-9 pr-9 text-[14px] text-[#374151] outline-none transition focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/20 cursor-pointer">
                <option value="all">All Courses</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="h-11 appearance-none rounded-[12px] border border-[#e5e7eb] bg-white pl-9 pr-9 text-[14px] text-[#374151] outline-none transition focus:border-[#d97706] focus:ring-2 focus:ring-[#d97706]/20 cursor-pointer">
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="CLOSED">Closed</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
            </div>
          </div>
        </RevealSection>

        {/* ── Assignments list ── */}
        <RevealSection>
          <section className="overflow-hidden rounded-[28px] border border-[#e8eaef] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#eef0f3] px-6 py-5">
              <div>
                <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">All Assignments</h2>
                <p className="mt-0.5 text-[13px] text-[#667085]">
                  {loading ? "Loading…" : `${assignments.length} result${assignments.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <motion.button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 rounded-[12px] bg-gradient-to-r from-[#d97706] to-[#f59e0b] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_16px_rgba(217,119,6,0.25)]"
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              >
                <Plus className="h-4 w-4" />New
              </motion.button>
            </div>

            <div className="space-y-3 p-5">
              {loading ? (
                [1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-[18px] bg-[#f3f4f6]" />)
              ) : error ? (
                <p className="rounded-[22px] border border-dashed border-[#fecaca] bg-[#fff5f5] px-5 py-12 text-center text-[14px] text-[#dc2626]">⚠️ {error}</p>
              ) : assignments.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[#d7dbe2] bg-[#fafafa] px-5 py-16 text-center">
                  <p className="text-[40px]">📋</p>
                  <p className="mt-3 text-[16px] font-semibold text-[#374151]">No assignments found</p>
                  <p className="mt-2 text-[13px] text-[#667085]">
                    {search || courseFilter !== "all" || statusFilter !== "all"
                      ? "Try adjusting your filters."
                      : "Click \"New Assignment\" to create the first one."}
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {assignments.map((a, i) => (
                    <motion.article
                      key={a.id}
                      className="group rounded-[18px] border border-[#eceef2] bg-[#fcfcfd] px-5 py-4"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: i * 0.03, duration: 0.32, ease }}
                      whileHover={{ y: -3, boxShadow: "0 10px 24px rgba(15,23,42,0.07)" }}
                      layout
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[#101828] truncate">{a.title}</p>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE[a.status] ?? STATUS_BADGE.DRAFT}`}>
                              {a.status}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[13px] text-[#667085]">
                            {a.course?.title ?? "No course"} · {a.points} pts
                            {a.deadline && <span className="ml-2">· Due {formatShortDate(a.deadline)}</span>}
                          </p>
                        </div>

                        {/* Status changer */}
                        <div className="relative shrink-0">
                          <select
                            value={a.status}
                            onChange={(e) => handleStatusChange(a, e.target.value as "DRAFT" | "ACTIVE" | "CLOSED")}
                            onClick={(e) => e.stopPropagation()}
                            className="appearance-none rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-1.5 pr-7 text-[12px] font-medium text-[#374151] outline-none cursor-pointer transition hover:border-[#d97706]"
                          >
                            <option value="DRAFT">Draft</option>
                            <option value="ACTIVE">Active</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#9ca3af]" />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-[#94a3b8]">
                        <span>{a.submissions?.length ?? 0} submissions</span>
                        <span>{a.submissions?.filter((s) => s.score !== null).length ?? 0} graded</span>
                        <span>Created {formatShortDate(a.createdAt)}</span>

                        {a.attachmentUrl && (
                          <a href={a.attachmentUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-[#fee2e2] px-2.5 py-0.5 text-[11px] font-semibold text-[#dc2626] hover:bg-[#fecaca]">
                            <FileText className="h-3 w-3" />PDF
                          </a>
                        )}

                        <button
                          onClick={() => setViewingAssignment(a)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#e0f2fe] px-2.5 py-0.5 text-[11px] font-semibold text-[#0284c7] hover:bg-[#bae6fd]"
                        >
                          View Submissions →
                        </button>

                        <button
                          onClick={() => setDeletingAssignment(a)}
                          className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-[#9ca3af] opacity-0 transition group-hover:opacity-100 hover:bg-[#fee2e2] hover:text-[#dc2626]"
                        >
                          <Trash2 className="h-3 w-3" />Delete
                        </button>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </section>
        </RevealSection>
      </div>

      {/* ── Modals / Drawer ── */}
      <AnimatePresence>
        {showCreate && (
          <CreateAssignmentModal courses={courses} onClose={() => setShowCreate(false)} onSuccess={fetchData} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingAssignment && (
          <SubmissionsDrawer assignment={viewingAssignment} onClose={() => setViewingAssignment(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingAssignment && (
          <DeleteConfirmModal
            assignmentTitle={deletingAssignment.title}
            onConfirm={handleDelete}
            onClose={() => setDeletingAssignment(null)}
            deleting={isDeleting}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
