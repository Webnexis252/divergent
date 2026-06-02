"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  SearchCheck,
  X,
  House,
  BookOpen,
  Video,
  MessageSquareText,
  CircleHelp,
  NotebookPen,
  ChartNoAxesColumn,
  Award,
  UserCircle,
  UploadCloud,
  FileText,
  Trash2,
  Loader2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { brand } from "@/lib/brand";
import { cx } from "@/lib/cx";
import { formatShortDate } from "@/lib/date-format";
import { DashboardSidebar } from "@/app/dashboard/_components/sidebar-nav";
import {
  AnimCard,
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "../_components/motion-wrappers";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  points: number;
  courseTitle: string;
  courseSlug: string | null;
  submission: {
    id: string;
    score: number | null;
    submittedAt: string;
    feedback: string | null;
    gradedAt: string | null;
  } | null;
};

type AssignmentsData = {
  upcoming: Assignment[];
  pending: Assignment[];
  completed: Assignment[];
};

type AssignmentFilter = "all" | "submitted" | "pending";

type AssignmentCardItem = Assignment & {
  bucket: keyof AssignmentsData;
  state: "submitted" | "pending" | "late";
};

const assets = {
  headerAvatar:
    "https://api.dicebear.com/9.x/shapes/svg?seed=021745ae-afe4-4dce-ad5c-2dd5ad2195e1",
  dashboardIcon:
    "https://api.dicebear.com/9.x/shapes/svg?seed=cf63ebaf-2c2d-461d-b303-52e41d36c645",
  coursesIcon:
    "https://api.dicebear.com/9.x/shapes/svg?seed=f5a0a60c-baa8-428d-b6e0-24fe7150e184",
  liveClassesIcon:
    "https://api.dicebear.com/9.x/shapes/svg?seed=95f74062-c186-4036-9109-4876860c1840",
  communityIcon:
    "https://api.dicebear.com/9.x/shapes/svg?seed=2adf51c8-f658-4f1e-84e4-26a5345706d5",
  assignmentsIcon:
    "https://api.dicebear.com/9.x/shapes/svg?seed=ffea850b-8a37-4bd9-9bcf-92f2122bf9d0",
  progressIcon:
    "https://api.dicebear.com/9.x/shapes/svg?seed=4c09dd54-76f0-47cb-81bd-6df94c0bdcf9",
  calendarIcon:
    "https://api.dicebear.com/9.x/shapes/svg?seed=4853766a-1632-4bc4-912e-5e43efdf5ec1",
} as const;

const filters: Array<{
  description: string;
  id: AssignmentFilter;
  label: string;
}> = [
  {
    description: "All assignments across every submission state.",
    id: "all",
    label: "All Assignments",
  },
  {
    description: "Assignments you have already submitted.",
    id: "submitted",
    label: "Submitted",
  },
  {
    description: "Assignments still waiting for submission.",
    id: "pending",
    label: "Pending",
  },
] as const;

const stateMeta = {
  late: {
    badgeClass: "bg-[#fff1f2] text-[#fb2c36]",
    buttonLabel: "Submit Assignment",
    helper: "Needs attention",
    label: "Late",
    scoreClass: "text-[#fb2c36]",
  },
  pending: {
    badgeClass: "bg-[#fff7db] text-[#f59e0b]",
    buttonLabel: "Submit Assignment",
    helper: "Awaiting submission",
    label: "Pending",
    scoreClass: "text-[#8b8888]",
  },
  submitted: {
    badgeClass: "bg-[#e8faed] text-[#22a447]",
    buttonLabel: "View Details",
    helper: "Submission recorded",
    label: "Submitted",
    scoreClass: "text-[#22a447]",
  },
} as const;

function buildAssignmentCard(
  assignment: Assignment,
  bucket: keyof AssignmentsData,
): AssignmentCardItem {
  if (assignment.submission) {
    return { ...assignment, bucket, state: "submitted" };
  }

  if (assignment.deadline && new Date(assignment.deadline).getTime() < Date.now()) {
    return { ...assignment, bucket, state: "late" };
  }

  return { ...assignment, bucket, state: "pending" };
}

function formatDeadlineLabel(value: string | null) {
  if (!value) return "No deadline";
  return formatShortDate(value);
}

function formatSubmittedLabel(value: string | null | undefined) {
  if (!value) return "Not submitted";
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function iconBadgeClass(color: "blue" | "green" | "yellow") {
  if (color === "green") {
    return "bg-[linear-gradient(180deg,#c8fff0_0%,#8be9c5_100%)] text-[#22a447]";
  }

  if (color === "yellow") {
    return "bg-[linear-gradient(180deg,#fff3b3_0%,#ffd65a_100%)] text-[#f59e0b]";
  }

  return "bg-[linear-gradient(180deg,#d8f3ff_0%,#a3e2ff_100%)] text-[#1597d4]";
}

function AssignmentStatCard({
  icon,
  iconTone,
  title,
  value,
}: {
  icon: React.ReactNode;
  iconTone: "blue" | "green" | "yellow";
  title: string;
  value: string;
}) {
  return (
    <AnimCard className="h-full">
      <article className="rounded-[22px] bg-[#72d3ff] px-6 py-5 text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div className={cx("grid h-16 w-16 place-items-center rounded-[20px] shadow-[0_8px_20px_rgba(255,255,255,0.25)]", iconBadgeClass(iconTone))}>
            {icon}
          </div>
          <p className="pt-1 text-[clamp(2.5rem,4vw,3.4rem)] font-semibold leading-none text-[#fec600]">
            {value}
          </p>
        </div>
        <p className="mt-5 text-[clamp(1rem,2vw,1.45rem)] font-semibold text-white">
          {title}
        </p>
      </article>
    </AnimCard>
  );
}

function AssignmentFilterBar({
  activeFilter,
  onChange,
}: {
  activeFilter: AssignmentFilter;
  onChange: (value: AssignmentFilter) => void;
}) {
  return (
    <RevealSection delay={0.04}>
      <div className="rounded-[20px] bg-white px-4 py-3 shadow-[0_4px_10px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-[12px] font-medium text-[#7c7a7a]">Filter:</p>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isActive = filter.id === activeFilter;

              return (
                <button
                  key={filter.id}
                  className={cx(
                    "rounded-[8px] px-4 py-1.5 text-[12px] font-medium transition-colors duration-150",
                    isActive
                      ? "bg-[#38c1ff] text-white shadow-[0_6px_16px_rgba(56,193,255,0.24)]"
                      : "bg-[#f5f5f5] text-[#7c7a7a] hover:bg-[#ebebeb]",
                  )}
                  onClick={() => onChange(filter.id)}
                  type="button"
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </RevealSection>
  );
}

function AssignmentCard({
  assignment,
  onOpenDetails,
  onOpenSubmit,
}: {
  assignment: AssignmentCardItem;
  onOpenDetails: (assignment: AssignmentCardItem) => void;
  onOpenSubmit: (assignment: AssignmentCardItem) => void;
}) {
  const meta = stateMeta[assignment.state];
  const scoreLabel =
    assignment.submission?.score != null
      ? `${Math.round(assignment.submission.score)}/${assignment.points || 100}`
      : assignment.state === "submitted"
        ? "Pending grade"
        : meta.helper;

  return (
    <AnimCard className="h-full">
      <article className="flex h-full flex-col rounded-[22px] bg-white px-4 py-4 shadow-[0_4px_10px_rgba(0,0,0,0.08)] sm:px-5 sm:py-4">
        <div className="space-y-4">
          <span className="inline-flex rounded-full bg-[#f3f3f3] px-3 py-1 text-[10px] font-medium text-[#8b8888]">
            {assignment.courseTitle}
          </span>

          <div>
            <h3 className="text-[1.35rem] font-semibold leading-[1.15] text-black">
              {assignment.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-[#8b8888]">
              {assignment.description || "Assignment brief will appear here once your mentor adds it."}
            </p>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-[#6f6d6d]">
            <CalendarDays className="h-4 w-4 text-[#9b9898]" />
            <span>
              Deadline: <span className="font-semibold text-black">{formatDeadlineLabel(assignment.deadline)}</span>
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-1 flex-col justify-end">
          <div className="mb-4 flex items-center justify-between gap-3 text-[11px]">
            <span className={cx("inline-flex rounded-full px-3 py-1 font-medium", meta.badgeClass)}>
              {meta.label}
            </span>
            <span className={cx("font-semibold", meta.scoreClass)}>
              {scoreLabel}
            </span>
          </div>

          <button
            className="inline-flex h-[40px] items-center justify-center rounded-[10px] bg-[#38c1ff] px-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(56,193,255,0.24)] transition-transform duration-150 ease-out hover:-translate-y-0.5"
            onClick={() =>
              assignment.state === "submitted"
                ? onOpenDetails(assignment)
                : onOpenSubmit(assignment)
            }
            type="button"
          >
            {meta.buttonLabel}
          </button>
        </div>
      </article>
    </AnimCard>
  );
}

function SubmissionModal({
  assignment,
  onClose,
  onSubmit,
  submitContent,
  setSubmitContent,
  submitting,
  submitSuccess,
  uploadedFileName,
  uploadedFileUrl,
  onFileSelected,
  onFileClear,
  uploadingFile,
  submitRewardXp,
}: {
  assignment: AssignmentCardItem;
  onClose: () => void;
  onSubmit: (draft?: boolean) => void;
  submitContent: string;
  setSubmitContent: (value: string) => void;
  submitting: boolean;
  submitSuccess: boolean;
  uploadedFileName: string;
  uploadedFileUrl: string;
  onFileSelected: (file: File) => void;
  onFileClear: () => void;
  uploadingFile: boolean;
  submitRewardXp: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }

  const hasContent = uploadedFileUrl || submitContent.trim();

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        className="w-full max-w-[640px] overflow-hidden rounded-[24px] bg-white shadow-[0_32px_80px_rgba(0,0,0,0.22)]"
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 24 }}
        initial={{ scale: 0.96, y: 24 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
      >
        {submitSuccess ? (
          <div className="py-16 text-center">
            <motion.div
              className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#e8faed] text-[#22a447]"
              animate={{ scale: 1 }}
              initial={{ scale: 0.8 }}
              transition={{ type: "spring", stiffness: 260 }}
            >
              <CheckCircle2 className="h-10 w-10" />
            </motion.div>
            <p className="mt-6 text-[1.5rem] font-semibold text-[#15803d]">Assignment submitted!</p>
            <p className="mt-2 text-[14px] text-[#6b7280]">
              {submitRewardXp > 0
                ? `Your work has been sent for review and you earned ${submitRewardXp} XP.`
                : 'Your updated work has been sent for review.'}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-[#f0f0f0] px-7 py-5">
              {/* Breadcrumb */}
              <p className="text-[12px] text-[#9ca3af]">
                Assignments
                <span className="mx-1.5">›</span>
                <span>{assignment.courseTitle}</span>
                <span className="mx-1.5">›</span>
                <span className="text-[#374151]">{assignment.title}</span>
              </p>

              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[1.35rem] font-bold text-[#111827]">{assignment.title}</h3>
                  <span className="mt-2 inline-flex rounded-full bg-[#f3f4f6] px-3 py-1 text-[12px] font-medium text-[#374151]">
                    {assignment.courseTitle}
                  </span>
                </div>
                <button
                  className="mt-1 shrink-0 rounded-full p-1.5 text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-black"
                  onClick={onClose}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Meta row */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-[13px] text-[#374151]">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-[#9ca3af]" />
                  <span className="font-medium">Deadline:</span> {assignment.deadline
                    ? new Date(assignment.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                    : "No deadline"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5 text-[#9ca3af]" />
                  <span className="font-medium">Status:</span>
                  <span className="font-semibold text-[#f59e0b]">Pending</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-[#9ca3af]" />
                  <span className="font-medium">Max File Size:</span> 20MB
                </span>
              </div>
              <div className="mt-4 rounded-[14px] border border-[#dcfce7] bg-[#f0fdf4] px-4 py-3 text-[13px] font-medium text-[#15803d]">
                First-time assignment submission rewards +150 XP.
              </div>
            </div>

            {/* Body */}
            <div className="space-y-5 px-7 py-6">
              {/* Drop zone */}
              <div
                className={cx(
                  "relative flex cursor-pointer flex-col items-center justify-center rounded-[16px] border-2 border-dashed py-10 transition-colors",
                  isDragging
                    ? "border-[#38c1ff] bg-[#e0f5ff]"
                    : uploadedFileName
                      ? "border-[#34d399] bg-[#ecfdf5]"
                      : "border-[#bae6fd] bg-[#f0faff] hover:border-[#38c1ff]",
                )}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDrop={handleDrop}
                onClick={() => !uploadedFileName && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  accept=".pdf,.docx,.doc,.zip"
                  className="sr-only"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelected(f); }}
                  type="file"
                />

                {uploadingFile ? (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin text-[#38c1ff]" />
                    <p className="mt-3 text-[14px] font-medium text-[#38c1ff]">Uploading...</p>
                  </>
                ) : uploadedFileName ? (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d1fae5]">
                      <FileText className="h-7 w-7 text-[#059669]" />
                    </div>
                    <p className="mt-3 max-w-[300px] truncate text-center text-[14px] font-semibold text-[#059669]">
                      {uploadedFileName}
                    </p>
                    <p className="mt-1 text-[12px] text-[#6b7280]">File ready to submit</p>
                    <button
                      className="mt-4 flex items-center gap-1.5 rounded-full border border-[#fca5a5] bg-white px-4 py-1.5 text-[12px] font-medium text-[#ef4444] transition-colors hover:bg-[#fef2f2]"
                      onClick={(e) => { e.stopPropagation(); onFileClear(); }}
                      type="button"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove file
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#38c1ff]">
                      <UploadCloud className="h-7 w-7 text-white" />
                    </div>
                    <p className="mt-3 text-[15px] font-semibold text-[#1f2937]">Drag &amp; drop your file here</p>
                    <p className="mt-1 text-[13px] text-[#9ca3af]">Supports PDF, DOCX, ZIP</p>
                    <button
                      className="mt-4 rounded-full bg-[#38c1ff] px-6 py-2 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(56,193,255,0.3)] transition-transform hover:-translate-y-0.5"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      type="button"
                    >
                      Browse Files
                    </button>
                  </>
                )}
              </div>

              {/* Submission Notes */}
              <div>
                <label className="text-[14px] font-semibold text-[#111827]">
                  Submission Notes
                </label>
                <textarea
                  className="mt-2 w-full resize-none rounded-[14px] border border-[#e5e7eb] bg-white px-4 py-3 text-[14px] text-[#374151] outline-none placeholder:text-[#9ca3af] transition focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20"
                  onChange={(e) => setSubmitContent(e.target.value)}
                  placeholder="Add any notes for your instructor..."
                  rows={4}
                  value={submitContent}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[#f0f0f0] px-7 py-5">
              <button
                className="inline-flex h-11 items-center justify-center rounded-[12px] border border-[#e5e7eb] px-6 text-[14px] font-medium text-[#374151] transition-colors hover:bg-[#f9fafb] disabled:opacity-50"
                disabled={submitting || !hasContent}
                onClick={() => onSubmit(true)}
                type="button"
              >
                Save Draft
              </button>
              <button
                className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#38c1ff] px-7 text-[14px] font-semibold text-white shadow-[0_6px_16px_rgba(56,193,255,0.3)] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                disabled={submitting || !hasContent || uploadingFile}
                onClick={() => onSubmit(false)}
                type="button"
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                ) : "Submit Assignment"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function DetailsModal({
  assignment,
  onClose,
}: {
  assignment: AssignmentCardItem;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-[560px] rounded-[24px] bg-white p-7 shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 24 }}
        initial={{ scale: 0.96, y: 24 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#22a447]">
              Submission Details
            </p>
            <h3 className="mt-2 text-[1.35rem] font-semibold text-black">
              {assignment.title}
            </h3>
            <p className="mt-2 text-[14px] leading-6 text-[#6f6d6d]">
              {assignment.courseTitle}
            </p>
          </div>
          <button
            className="rounded-full p-2 text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-black"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] bg-[#f7f5f4] px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c7a7a]">
              Submitted
            </p>
            <p className="mt-2 text-[15px] font-semibold text-black">
              {formatSubmittedLabel(assignment.submission?.submittedAt)}
            </p>
          </div>
          <div className="rounded-[18px] bg-[#f7f5f4] px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c7a7a]">
              Score
            </p>
            <p className="mt-2 text-[15px] font-semibold text-[#22a447]">
              {assignment.submission?.score != null
                ? `${Math.round(assignment.submission.score)}/${assignment.points || 100}`
                : "Pending grade"}
            </p>
          </div>
          <div className="rounded-[18px] bg-[#f7f5f4] px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c7a7a]">
              Deadline
            </p>
            <p className="mt-2 text-[15px] font-semibold text-black">
              {formatDeadlineLabel(assignment.deadline)}
            </p>
          </div>
          <div className="rounded-[18px] bg-[#f7f5f4] px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#7c7a7a]">
              Grading
            </p>
            <p className="mt-2 text-[15px] font-semibold text-black">
              {assignment.submission?.gradedAt
                ? `Graded ${formatSubmittedLabel(assignment.submission.gradedAt)}`
                : "Awaiting review"}
            </p>
          </div>
        </div>

        {assignment.submission?.feedback && (
          <div className="mt-4 rounded-[18px] border border-[#d1fae5] bg-[#ecfdf5] p-5">
            <p className="text-[12px] font-bold uppercase tracking-wider text-[#059669]">
              Teacher Feedback
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#065f46]">
              {assignment.submission.feedback}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {assignment.courseSlug ? (
            <Link
              className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#38c1ff] px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(56,193,255,0.24)] transition-transform duration-150 ease-out hover:-translate-y-0.5"
              href={`/dashboard/courses/${assignment.courseSlug}`}
            >
              Open Course
            </Link>
          ) : null}
          <button
            className="inline-flex h-12 items-center justify-center rounded-[14px] border border-[#e5e7eb] px-5 text-[14px] font-medium text-[#374151] transition-colors hover:bg-[#f9fafb]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function DashboardAssignmentsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AssignmentsData>({
    upcoming: [],
    pending: [],
    completed: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<AssignmentFilter>("all");
  const [submitAssignment, setSubmitAssignment] = useState<AssignmentCardItem | null>(
    null,
  );
  const [detailsAssignment, setDetailsAssignment] = useState<AssignmentCardItem | null>(
    null,
  );
  const [submitContent, setSubmitContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitRewardXp, setSubmitRewardXp] = useState(0);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  function fetchAssignments() {
    setLoading(true);

    fetch("/api/users/me/assignments")
      .then((response) => response.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        }
      })
      .catch((error) => {
        console.error("Failed to load assignments", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchAssignments();
  }, []);

  const displayName = user?.name?.trim() || "Student";
  const upcomingAssignments = useMemo(
    () => data.upcoming.map((assignment) => buildAssignmentCard(assignment, "upcoming")),
    [data.upcoming],
  );
  const pendingAssignments = useMemo(
    () => data.pending.map((assignment) => buildAssignmentCard(assignment, "pending")),
    [data.pending],
  );
  const submittedAssignments = useMemo(
    () => data.completed.map((assignment) => buildAssignmentCard(assignment, "completed")),
    [data.completed],
  );
  const pendingAndUpcomingAssignments = useMemo(
    () => [...upcomingAssignments, ...pendingAssignments],
    [pendingAssignments, upcomingAssignments],
  );
  const allAssignments = useMemo(
    () => [...pendingAndUpcomingAssignments, ...submittedAssignments],
    [pendingAndUpcomingAssignments, submittedAssignments],
  );
  const filteredAssignments = useMemo(() => {
    if (activeFilter === "submitted") {
      return submittedAssignments;
    }

    if (activeFilter === "pending") {
      return pendingAndUpcomingAssignments;
    }

    return allAssignments;
  }, [activeFilter, allAssignments, pendingAndUpcomingAssignments, submittedAssignments]);

  const totalAssignmentsCount = allAssignments.length;
  const submittedAssignmentsCount = submittedAssignments.length;
  const pendingAssignmentsCount = pendingAndUpcomingAssignments.length;

  function openSubmitModal(assignment: AssignmentCardItem) {
    setSubmitContent("");
    setUploadedFileUrl("");
    setUploadedFileName("");
    setSubmitSuccess(false);
    setSubmitRewardXp(0);
    setSubmitAssignment(assignment);
  }

  const handleFileSelected = useCallback(async (file: File) => {
    setUploadingFile(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/assignments", { method: "POST", body: form });
      const json = await res.json();
      if (json.success && json.data?.url) {
        setUploadedFileUrl(json.data.url);
        setUploadedFileName(file.name);
      } else {
        alert(json.message || "Upload failed. Please try again.");
      }
    } catch {
      alert("Upload failed. Please check your connection and try again.");
    } finally {
      setUploadingFile(false);
    }
  }, []);

  function handleFileClear() {
    setUploadedFileUrl("");
    setUploadedFileName("");
  }

  function openDetailsModal(assignment: AssignmentCardItem) {
    setDetailsAssignment(assignment);
  }

  async function handleSubmitAssignment() {
    if (!submitAssignment || submitting) return;
    if (!submitContent.trim() && !uploadedFileUrl) return;

    setSubmitting(true);

    try {
      const response = await fetch(`/api/assignments/${submitAssignment.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: submitContent.trim() || undefined,
          fileUrl: uploadedFileUrl || undefined,
        }),
      });
      const json = await response.json();

      if (json.success || response.status === 201) {
        setSubmitRewardXp(
          typeof json?.data?.xpAwarded === "number" ? json.data.xpAwarded : 0,
        );
        setSubmitSuccess(true);
        setTimeout(() => {
          setSubmitAssignment(null);
          fetchAssignments();
        }, 1800);
      }
    } catch (error) {
      console.error("Failed to submit assignment", error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="text-black">
      <PageTransition>
        <main className="min-h-screen overflow-x-hidden bg-[#f9fafb] pb-24 sm:bg-[#f7f5f4] sm:pb-0">


          <div className="mx-auto max-w-[1920px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-0 xl:py-8">
            <div className="grid gap-6 xl:grid-cols-[222px_minmax(0,1fr)] xl:items-start">
              <DashboardSidebar />

              <section className="min-w-0 px-0 sm:px-4 xl:pr-10">
                <div className="mx-auto max-w-[1160px] space-y-5 sm:space-y-6">
                  <RevealSection>
                    <div className="grid gap-5 md:grid-cols-3">
                      <AssignmentStatCard
                        icon={<ClipboardList className="h-8 w-8" />}
                        iconTone="blue"
                        title="Total Assignments"
                        value={loading ? "..." : String(totalAssignmentsCount)}
                      />
                      <AssignmentStatCard
                        icon={<ClipboardCheck className="h-8 w-8" />}
                        iconTone="green"
                        title="Submitted"
                        value={loading ? "..." : String(submittedAssignmentsCount)}
                      />
                      <AssignmentStatCard
                        icon={<Clock3 className="h-8 w-8" />}
                        iconTone="yellow"
                        title="Pending"
                        value={loading ? "..." : String(pendingAssignmentsCount)}
                      />
                    </div>
                  </RevealSection>

                  <AssignmentFilterBar
                    activeFilter={activeFilter}
                    onChange={setActiveFilter}
                  />

                  {loading ? (
                    <RevealSection delay={0.06}>
                      <div className="flex min-h-[18rem] items-center justify-center rounded-[24px] bg-white text-black/50 shadow-[0_4px_10px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center gap-3">
                          <Spinner className="h-6 w-6 border-[#38c1ff] text-[#38c1ff]" />
                          Loading assignment workspace...
                        </div>
                      </div>
                    </RevealSection>
                  ) : filteredAssignments.length === 0 ? (
                    <RevealSection delay={0.08}>
                      <div className="rounded-[24px] bg-white px-6 py-16 shadow-[0_4px_10px_rgba(0,0,0,0.06)]">
                        <EmptyState
                          description={
                            activeFilter === "submitted"
                              ? "Submitted assignments will appear here once you send your first one for review."
                              : activeFilter === "pending"
                                ? "You do not have any pending assignments right now."
                                : "Assignments will appear here once your enrolled courses publish them."
                          }
                          icon={<SearchCheck className="h-6 w-6" />}
                          title="No assignments to show"
                        />
                      </div>
                    </RevealSection>
                  ) : (
                    <RevealSection delay={0.08}>
                      <StaggerGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {filteredAssignments.map((assignment) => (
                          <AssignmentCard
                            assignment={assignment}
                            key={assignment.id}
                            onOpenDetails={openDetailsModal}
                            onOpenSubmit={openSubmitModal}
                          />
                        ))}
                      </StaggerGrid>
                    </RevealSection>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </PageTransition>

      <AnimatePresence>
        {submitAssignment ? (
          <SubmissionModal
            assignment={submitAssignment}
            onClose={() => setSubmitAssignment(null)}
            onSubmit={() => void handleSubmitAssignment()}
            setSubmitContent={setSubmitContent}
            submitContent={submitContent}
            submitSuccess={submitSuccess}
            submitting={submitting}
            uploadedFileName={uploadedFileName}
            uploadedFileUrl={uploadedFileUrl}
            onFileSelected={handleFileSelected}
            onFileClear={handleFileClear}
            uploadingFile={uploadingFile}
            submitRewardXp={submitRewardXp}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {detailsAssignment ? (
          <DetailsModal
            assignment={detailsAssignment}
            onClose={() => setDetailsAssignment(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
