"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { TeacherSidebar } from "./teacher-sidebar";

import { PageTransition, RevealSection, StaggerGrid } from "./motion-wrappers";
import { formatShortDate } from "@/lib/date-format";

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
  course: { title: string } | null;
  submissions: { id: string; score: number | null }[];
};

const statusBadge: Record<string, string> = {
  ACTIVE: "bg-[#ecfdf5] text-[#15803d]",
  DRAFT: "bg-[#f1f5f9] text-[#64748b]",
  CLOSED: "bg-[#fff1f2] text-[#dc2626]",
};

const ease = [0.25, 0.46, 0.45, 0.94] as const;

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

  // PDF upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPdf = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be under 10 MB");
      return;
    }
    setError(null);
    setPdfFile(file);
    setUploading(true);
    setUploadProgress(0);

    // Animate progress bar while uploading
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 12, 85));
    }, 120);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/assignments", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      clearInterval(progressInterval);
      if (json.success) {
        setUploadProgress(100);
        setAttachmentUrl(json.data.url);
      } else {
        setError(json.error ?? "Upload failed");
        setPdfFile(null);
        setUploadProgress(0);
      }
    } catch {
      clearInterval(progressInterval);
      setError("Upload failed — please try again");
      setPdfFile(null);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) uploadPdf(files[0]);
  };

  const removePdf = () => {
    setPdfFile(null);
    setAttachmentUrl(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!title.trim() || !courseId) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/teacher/assignments", {
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
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1400);
      } else {
        setError(json.error ?? "Failed to create assignment");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-[560px] max-h-[92vh] overflow-y-auto rounded-[28px] bg-white p-8 shadow-[0_28px_64px_rgba(0,0,0,0.22)]"
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 24 }}
        initial={{ scale: 0.94, y: 24 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
      >
        {success ? (
          <div className="py-10 text-center">
            <motion.p
              className="text-[52px]"
              animate={{ scale: 1 }}
              initial={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 260 }}
            >
              ✅
            </motion.p>
            <p className="mt-4 text-[20px] font-semibold text-[#15803d]">
              Assignment created!
            </p>
            <p className="mt-2 text-[13px] text-[#6b7280]">
              Students enrolled in this course will be notified.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex rounded-full bg-[#eef6ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
                  New Assignment
                </div>
                <h3 className="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-black">
                  Create Assignment
                </h3>
                <p className="mt-1 text-[13px] text-[#6b7280]">
                  Only students enrolled in the selected course will see this.
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-[22px] leading-none text-[#9ca3af] transition-colors hover:text-black"
              >
                &times;
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {/* Course selector */}
              <div>
                <label className="text-[13px] font-medium text-[#374151]">
                  Course <span className="text-[#ef4444]">*</span>
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="mt-1 w-full rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20"
                >
                  {courses.length === 0 ? (
                    <option value="">You are not assigned to any course</option>
                  ) : (
                    courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-[13px] font-medium text-[#374151]">
                  Title <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Week 3 — Typography Critique"
                  className="mt-1 w-full rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20"
                />
              </div>

              {/* Points + Deadline */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[13px] font-medium text-[#374151]">Points</label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    min={0}
                    className="mt-1 w-full rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[13px] font-medium text-[#374151]">Deadline</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="mt-1 w-full rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[13px] font-medium text-[#374151]">
                  Description / Instructions
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add brief instructions or useful links..."
                  className="mt-1 w-full resize-none rounded-[12px] border border-[#d1d5db] bg-[#f9fafb] px-4 py-3 text-[14px] text-black outline-none transition focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20"
                />
              </div>

              {/* PDF Upload */}
              <div>
                <label className="text-[13px] font-medium text-[#374151]">
                  Attachment <span className="text-[#9ca3af] font-normal">(PDF, max 10 MB)</span>
                </label>

                {!pdfFile ? (
                  <motion.div
                    className={`mt-1 flex flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed px-6 py-7 transition-colors cursor-pointer ${
                      dragOver
                        ? "border-[#38c1ff] bg-[#f0faff]"
                        : "border-[#d1d5db] bg-[#f9fafb] hover:border-[#38c1ff] hover:bg-[#f0faff]"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      handleFileSelect(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef6ff]">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                      </svg>
                    </div>
                    <p className="text-[13px] font-medium text-[#374151]">
                      Drag & drop your PDF here
                    </p>
                    <p className="text-[12px] text-[#9ca3af]">or <span className="text-[#2563eb] underline">browse files</span></p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e.target.files)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    className="mt-1 rounded-[14px] border border-[#e5e7eb] bg-[#f9fafb] px-4 py-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center gap-3">
                      {/* PDF icon */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#fee2e2]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[#101828]">{pdfFile.name}</p>
                        <p className="text-[12px] text-[#667085]">
                          {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      {!uploading && (
                        <button
                          onClick={removePdf}
                          className="shrink-0 rounded-full p-1.5 text-[#9ca3af] transition hover:bg-[#f3f4f6] hover:text-[#374151]"
                          title="Remove file"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
                      <motion.div
                        className={`h-full rounded-full ${uploadProgress === 100 ? "bg-[#22c55e]" : "bg-[#38c1ff]"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#9ca3af]">
                      {uploading
                        ? `Uploading… ${uploadProgress}%`
                        : uploadProgress === 100
                        ? "✓ Uploaded successfully"
                        : ""}
                    </p>
                  </motion.div>
                )}
              </div>

              {error && (
                <p className="rounded-[10px] bg-[#fff5f5] px-4 py-2 text-[13px] text-[#dc2626]">
                  ⚠️ {error}
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <motion.button
                onClick={handleSubmit}
                disabled={submitting || uploading || !title.trim() || !courseId}
                className="flex-1 rounded-[12px] bg-[#38c1ff] py-3 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(56,193,255,0.28)] disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {submitting ? "Creating..." : uploading ? "Uploading PDF…" : "Post Assignment"}
              </motion.button>
              <button
                onClick={onClose}
                className="rounded-[12px] border border-[#e5e7eb] px-5 py-3 text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb]"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export function TeacherAssignmentsView() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/teacher/assignments").then((r) => r.json()),
      fetch("/api/teacher/courses").then((r) => r.json()),
    ])
      .then(([assignmentsJson, coursesJson]) => {
        if (assignmentsJson.success) {
          setAssignments(assignmentsJson.data?.assignments ?? []);
        } else {
          setError(assignmentsJson.error ?? "Failed to load assignments");
        }
        if (coursesJson.success) {
          setCourses(Array.isArray(coursesJson.data) ? coursesJson.data : []);
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount
    void fetchData();
  }, []);

  const totalSubs = assignments.reduce((s, a) => s + (a.submissions?.length ?? 0), 0);
  const graded = assignments.reduce(
    (s, a) => s + (a.submissions?.filter((x) => x.score !== null).length ?? 0),
    0,
  );
  const active = assignments.filter((a) => a.status === "ACTIVE").length;

  return (
    <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-6 px-3 pb-14 pt-4 sm:px-6 sm:pt-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:px-0 lg:pt-8">
          <TeacherSidebar />

          <main className="space-y-8 lg:pr-[160px]">
            {/* Hero */}
            <RevealSection>
              <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#fcd34d] px-6 py-10 text-white shadow-[0_24px_48px_rgba(251,191,36,0.3)] sm:px-8 lg:px-12 lg:py-12">
                <motion.div
                  className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/12 blur-3xl"
                  animate={{ scale: [1, 1.22, 1], opacity: [0.35, 0.6, 0.35] }}
                  transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div className="max-w-[720px]">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/75">
                      Teacher Portal
                    </p>
                    <h1 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
                      Assignments
                    </h1>
                    <p className="mt-4 max-w-[520px] text-[15px] leading-7 text-white/88">
                      Create assignments for your courses. Students receive an instant notification and
                      only enrolled students can see each assignment.
                    </p>
                  </div>

                  <motion.button
                    onClick={() => setShowCreate(true)}
                    className="shrink-0 rounded-[16px] bg-white px-6 py-3 text-[14px] font-semibold text-[#b45309] shadow-[0_8px_24px_rgba(0,0,0,0.14)] transition hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    + New Assignment
                  </motion.button>
                </div>
              </section>
            </RevealSection>

            {/* Stat cards */}
            <StaggerGrid className="grid gap-5 sm:grid-cols-3">
              {[
                { label: "Total", value: loading ? "…" : String(assignments.length), note: "All assignments you've created" },
                { label: "Active", value: loading ? "…" : String(active), note: "Currently accepting submissions" },
                { label: "Submissions", value: loading ? "…" : String(totalSubs), note: `${graded} graded` },
              ].map((card, i) => (
                <motion.article
                  key={card.label}
                  className="rounded-[22px] border border-[#ededed] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4, ease }}
                  whileHover={{ y: -4 }}
                >
                  <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#667085]">
                    {card.label}
                  </p>
                  <p className="mt-4 text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#101828]">
                    {card.value}
                  </p>
                  <p className="mt-2 text-[12px] text-[#667085]">{card.note}</p>
                </motion.article>
              ))}
            </StaggerGrid>

            {/* Assignment list */}
            <RevealSection>
              <section className="overflow-hidden rounded-[28px] border border-[#e8eaef] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-4 border-b border-[#eef0f3] px-6 py-5">
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">
                      Your Assignments
                    </h2>
                    <p className="mt-0.5 text-[13px] text-[#667085]">
                      {loading ? "Loading…" : `${assignments.length} total`}
                    </p>
                  </div>
                  <motion.button
                    onClick={() => setShowCreate(true)}
                    className="rounded-[12px] bg-[#38c1ff] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_6px_16px_rgba(56,193,255,0.25)]"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    + New
                  </motion.button>
                </div>

                <div className="space-y-3 p-5">
                  {loading ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="h-20 animate-pulse rounded-[18px] bg-[#f3f4f6]" />
                    ))
                  ) : error ? (
                    <p className="rounded-[22px] border border-dashed border-[#fecaca] bg-[#fff5f5] px-5 py-12 text-center text-[14px] text-[#dc2626]">
                      ⚠️ {error}
                    </p>
                  ) : assignments.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-[#d7dbe2] bg-[#fafafa] px-5 py-16 text-center">
                      <p className="text-[40px]">📋</p>
                      <p className="mt-3 text-[16px] font-semibold text-[#374151]">
                        No assignments yet
                      </p>
                      <p className="mt-2 text-[13px] text-[#667085]">
                        Click &ldquo;+ New Assignment&rdquo; to post your first one.
                      </p>
                    </div>
                  ) : (
                    assignments.map((a, i) => (
                      <motion.article
                        key={a.id}
                        className="rounded-[18px] border border-[#eceef2] bg-[#fcfcfd] px-5 py-4"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.35, ease }}
                        whileHover={{ y: -3, boxShadow: "0 10px 24px rgba(15,23,42,0.07)" }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#101828]">{a.title}</p>
                            <p className="mt-0.5 text-[13px] text-[#667085]">
                              {a.course?.title ?? "No course"} · {a.points} pts
                              {a.deadline && (
                                <span className="ml-2">· Due {formatShortDate(a.deadline)}</span>
                              )}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusBadge[a.status] ?? statusBadge.DRAFT}`}
                          >
                            {a.status}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-[#94a3b8]">
                          <span>{a.submissions?.length ?? 0} submissions</span>
                          <span>
                            {a.submissions?.filter((s) => s.score !== null).length ?? 0} graded
                          </span>
                          <span>Created {formatShortDate(a.createdAt)}</span>
                          {a.attachmentUrl && (
                            <a
                              href={a.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-[#fee2e2] px-2.5 py-0.5 text-[11px] font-semibold text-[#dc2626] transition hover:bg-[#fecaca]"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                              </svg>
                              PDF
                            </a>
                          )}
                          <Link
                            href={`/dashboard/teacher/assignments/${a.id}/submissions`}
                            className="inline-flex items-center gap-1 rounded-full bg-[#e0f2fe] px-2.5 py-0.5 text-[11px] font-semibold text-[#0284c7] transition hover:bg-[#bae6fd]"
                          >
                            View Submissions →
                          </Link>
                        </div>
                      </motion.article>
                    ))
                  )}
                </div>
              </section>
            </RevealSection>
          </main>
        </div>

        {/* Create modal */}
        <AnimatePresence>
          {showCreate && (
            <CreateAssignmentModal
              courses={courses}
              onClose={() => setShowCreate(false)}
              onSuccess={fetchData}
            />
          )}
        </AnimatePresence>
    </PageTransition>
  );
}
