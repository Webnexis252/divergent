"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, m as motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import { cx } from "@/lib/cx";
import { ASSIGNMENT_SUBMISSION_XP } from "@/lib/xp-costs";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHero } from "@/components/ui/page-hero";
import { AnimCard, PageTransition, RevealSection, StaggerGrid } from "../_components/motion-wrappers";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  points: number;
  attachmentUrl: string | null;
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

type AssignmentFilter = "all" | "todo" | "submitted";

type AssignmentItem = Assignment & { state: "todo" | "overdue" | "submitted" };

const art = {
  todo: "/assets/dashboard/quick-assignment.png",
  overdue: "/assets/dashboard/quick-exam.png",
  submitted: "/assets/dashboard/explore-library.png",
} as const;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// Brand blue darkened just enough to pass AA as small text on white.
// globals.css sets `a { color: inherit }` outside any layer, so text colours that land on links are marked `!`
const brandInk = "text-[color-mix(in_srgb,var(--brand-primary-strong)_72%,black)]!";
// globals.css also sets `button { font: inherit }`, so on <button>s the type utilities go on an inner span
const primaryAction =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-(--brand-primary-strong) px-5 text-white! shadow-[0_4px_12px_rgba(32,155,210,0.28)] transition-[transform,filter,background-color] duration-150 hover:-translate-y-0.5 hover:brightness-95 active:translate-y-0 disabled:pointer-events-none disabled:bg-black/[0.12] disabled:text-black/40! disabled:shadow-none";
const secondaryAction = cx(
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] border border-[rgba(56,193,255,0.45)] bg-white px-4 transition-colors duration-150 hover:bg-(--brand-primary-soft)",
  brandInk,
);
const card = "overflow-hidden rounded-[20px] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]";
const sectionTitle = "text-[clamp(1.5rem,2.6vw,1.85rem)] font-semibold tracking-[-0.02em] text-black";
const sectionLede = "mt-1 text-[14px] text-black/55";
const pill = "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold";
const rowGrid =
  "grid grid-cols-[4.75rem_minmax(0,1fr)] items-start gap-x-3 px-5 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-5 sm:px-6";
// Phones: the row action sits under the text instead of squeezing it
const rowAction = "col-start-2 mt-3 justify-self-start sm:col-start-auto sm:mt-0";

const dayFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("en-IN", { month: "short" });
const weekdayTimeFormatter = new Intl.DateTimeFormat("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit", hour12: true });
const longDateFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" });
const longDateTimeFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true });

function toItem(assignment: Assignment, now: number): AssignmentItem {
  if (assignment.submission) return { ...assignment, state: "submitted" };
  if (assignment.deadline && Date.parse(assignment.deadline) < now) return { ...assignment, state: "overdue" };
  return { ...assignment, state: "todo" };
}

function humanDuration(ms: number) {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  if (ms < 2 * DAY) return `${Math.round(ms / HOUR)} hr`;
  return `${Math.round(ms / DAY)} days`;
}

/** "Overdue by 2 days", "Due in 5 hr", "Due in 6 days", or null without a deadline */
function dueStatus(deadline: string | null, now: number) {
  if (!deadline) return null;
  const diff = Date.parse(deadline) - now;
  if (diff < 0) return { text: `Overdue by ${humanDuration(-diff)}`, tone: "overdue" as const };
  return { text: `Due in ${humanDuration(diff)}`, tone: diff < 2 * DAY ? ("soon" as const) : ("later" as const) };
}

function scoreLabel(assignment: Assignment) {
  const score = assignment.submission?.score;
  return score == null ? null : `${Math.round(score)}/${assignment.points || 100}`;
}

// ─── Small pieces ─────────────────────────────────────────────────────────────

function StatusPill({ assignment, now }: { assignment: AssignmentItem; now: number }) {
  if (assignment.state === "submitted") {
    const score = scoreLabel(assignment);
    return score ? (
      <span className={cx(pill, "bg-[rgba(76,175,80,0.14)] text-[#2e6b31]")}>Graded · {score}</span>
    ) : (
      <span className={cx(pill, "bg-(--brand-primary-soft)", brandInk)}>Submitted · awaiting grade</span>
    );
  }
  const due = dueStatus(assignment.deadline, now);
  // Rows already say "No deadline" in the date column
  if (!due) return null;
  return (
    <span
      className={cx(
        pill,
        "tabular-nums",
        due.tone === "overdue"
          ? "bg-[rgba(255,61,0,0.1)] text-[#b42d00]"
          : due.tone === "soon"
            ? "bg-[rgba(254,198,0,0.2)] text-[#6b4c00]"
            : "bg-black/[0.05] text-black/60",
      )}
    >
      {due.text}
    </span>
  );
}

function CoursePill({ title }: { title: string }) {
  return <span className={cx(pill, "truncate bg-(--brand-primary-soft)", brandInk)}>{title}</span>;
}

function BriefLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="relative z-10 inline-flex items-center gap-1 text-[12px] font-semibold text-black/55! underline-offset-2 transition-colors hover:text-black! hover:underline"
    >
      <FileText aria-hidden="true" className="h-3.5 w-3.5" />
      Brief
    </a>
  );
}

function StatCard({ image, label, value, note }: { image: string; label: string; value: string; note: string }) {
  return (
    <AnimCard className="min-w-[220px] flex-1 snap-start sm:min-w-0">
      <div className="flex items-center gap-4 rounded-[24px] bg-white p-3 pr-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
        <div className="grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-[18px] bg-[#f4f2ff]">
          <Image alt="" className="h-[76px] w-[76px] scale-[1.35] object-contain" height={152} src={image} width={152} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-black/55">{label}</p>
          <p className="mt-1 text-[2rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-black">{value}</p>
          <p className="mt-1 truncate text-[12px] text-black/45">{note}</p>
        </div>
      </div>
    </AnimCard>
  );
}

function FilterChip({ active, count, label, onClick }: { active: boolean; count: number; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 transition-colors",
        active ? "bg-(--brand-primary-strong) text-white" : "bg-white text-black/70 ring-1 ring-black/[0.06] hover:bg-black/[0.03]",
      )}
    >
      <span className="text-[13px] font-semibold">{label}</span>
      <span className={cx("text-[12px] font-semibold tabular-nums", active ? "text-white/80" : "text-black/40")}>{count}</span>
    </button>
  );
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

function AssignmentRow({
  assignment,
  now,
  onSubmit,
  onDetails,
}: {
  assignment: AssignmentItem;
  now: number;
  onSubmit: (assignment: AssignmentItem) => void;
  onDetails: (assignment: AssignmentItem) => void;
}) {
  const deadline = assignment.deadline ? new Date(assignment.deadline) : null;
  const isSubmitted = assignment.state === "submitted";

  return (
    <li className={cx("py-4 transition-colors hover:bg-[#f8fcff]", rowGrid)}>
      <div>
        {deadline ? (
          <time dateTime={assignment.deadline!} title={`Due ${longDateTimeFormatter.format(deadline)}`}>
            <span className="flex items-baseline gap-1.5">
              <span
                className={cx(
                  "text-[1.6rem] font-bold leading-none tracking-[-0.04em] tabular-nums",
                  assignment.state === "overdue" ? "text-[#b42d00]" : "text-black",
                )}
              >
                {dayFormatter.format(deadline)}
              </span>
              <span className="text-[13px] font-semibold text-black/55">{monthFormatter.format(deadline)}</span>
            </span>
            <span className="mt-1.5 block text-[11px] font-medium text-black/45">{weekdayTimeFormatter.format(deadline)}</span>
          </time>
        ) : (
          <p className="text-[12px] font-semibold leading-tight text-black/45">No deadline</p>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[16px] font-semibold leading-snug text-black">{assignment.title}</p>
        {assignment.description && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-black/55">{assignment.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusPill assignment={assignment} now={now} />
          <CoursePill title={assignment.courseTitle} />
          {assignment.points > 0 && (
            <span className="text-[12px] font-medium tabular-nums text-black/50">{assignment.points} points</span>
          )}
          {assignment.attachmentUrl && <BriefLink url={assignment.attachmentUrl} />}
        </div>
      </div>

      <div className={rowAction}>
        {isSubmitted ? (
          <button type="button" onClick={() => onDetails(assignment)} className={secondaryAction}>
            <span className="text-[14px] font-semibold">View</span>
          </button>
        ) : (
          <button type="button" onClick={() => onSubmit(assignment)} className={primaryAction}>
            <span className="text-[14px] font-semibold">Submit</span>
          </button>
        )}
      </div>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div role="status" className={card}>
      <span className="sr-only">Loading your assignments</span>
      {[0, 1, 2].map((row) => (
        <div key={row} className={cx(rowGrid, "border-t border-black/[0.05] py-5 first:border-t-0")}>
          <div className="space-y-2">
            <div className="h-6 w-12 animate-pulse rounded-md bg-black/[0.06]" />
            <div className="h-3 w-14 animate-pulse rounded bg-black/[0.04]" />
          </div>
          <div className="space-y-2.5">
            <div className="h-4 w-3/5 animate-pulse rounded bg-black/[0.07]" />
            <div className="h-6 w-40 animate-pulse rounded-full bg-black/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Dialogs ──────────────────────────────────────────────────────────────────

function Dialog({
  labelledBy,
  onClose,
  canClose = true,
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  canClose?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && canClose) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canClose, onClose]);

  return (
    // z-[120]: above the phone bottom navigation (z-100)
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center sm:p-4"
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && canClose) onClose();
      }}
    >
      <motion.div
        className="flex max-h-[92dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.24)] sm:rounded-[24px]"
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        initial={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function CloseButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Close"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-black/45 transition-colors hover:bg-black/[0.05] hover:text-black disabled:opacity-40"
    >
      <X aria-hidden="true" className="h-5 w-5" />
    </button>
  );
}

function SubmitDialog({
  assignment,
  now,
  onClose,
  onSubmit,
  notes,
  setNotes,
  submitting,
  submitted,
  rewardXp,
  error,
  fileName,
  fileUrl,
  uploadingFile,
  onFileSelected,
  onFileClear,
}: {
  assignment: AssignmentItem;
  now: number;
  onClose: () => void;
  onSubmit: () => void;
  notes: string;
  setNotes: (value: string) => void;
  submitting: boolean;
  submitted: boolean;
  rewardXp: number;
  error: string;
  fileName: string;
  fileUrl: string;
  uploadingFile: boolean;
  onFileSelected: (file: File) => void;
  onFileClear: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const canSubmit = Boolean(fileUrl || notes.trim()) && !uploadingFile && !submitting;
  const due = dueStatus(assignment.deadline, now);

  return (
    <Dialog labelledBy="submit-dialog-title" onClose={onClose} canClose={!submitting}>
      {submitted ? (
        <div className="px-6 py-14 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[rgba(76,175,80,0.14)] text-[#2e6b31]">
            <CheckCircle2 aria-hidden="true" className="h-8 w-8" />
          </div>
          <p id="submit-dialog-title" className="mt-5 text-[20px] font-bold text-black">
            Submitted
          </p>
          <p className="mt-1.5 text-[14px] text-black/60">
            {rewardXp > 0
              ? `Sent to your teacher for review. You earned ${rewardXp} XP.`
              : "Your updated work was sent to your teacher for review."}
          </p>
        </div>
      ) : (
        <>
          <header className="border-b border-black/[0.05] px-5 py-4 sm:px-7">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CoursePill title={assignment.courseTitle} />
                <h2 id="submit-dialog-title" className="mt-2 text-[20px] font-bold leading-snug text-black">
                  {assignment.title}
                </h2>
              </div>
              <CloseButton onClick={onClose} disabled={submitting} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {due ? <StatusPill assignment={assignment} now={now} /> : null}
              {assignment.deadline && (
                <span className="text-[12px] text-black/50">
                  Due {longDateTimeFormatter.format(new Date(assignment.deadline))}
                </span>
              )}
              <span className={cx(pill, "bg-[rgba(254,198,0,0.2)] text-[#6b4c00]")}>
                +{ASSIGNMENT_SUBMISSION_XP} XP on your first submission
              </span>
            </div>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7">
            {assignment.description && (
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-black/65">{assignment.description}</p>
            )}

            <div
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) onFileSelected(file);
              }}
              className={cx(
                "flex flex-col items-center justify-center rounded-[16px] border-2 border-dashed px-4 py-8 text-center transition-colors",
                isDragging
                  ? "border-(--brand-primary) bg-(--brand-primary-soft)"
                  : fileName
                    ? "border-[rgba(76,175,80,0.45)] bg-[rgba(76,175,80,0.06)]"
                    : "border-[rgba(56,193,255,0.45)] bg-[#f8fcff]",
              )}
            >
              <input
                ref={fileInputRef}
                accept=".pdf,.docx,.doc,.zip"
                className="sr-only"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFileSelected(file);
                  e.target.value = "";
                }}
              />
              {uploadingFile ? (
                <>
                  <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-(--brand-primary-strong)" />
                  <p className="mt-3 text-[14px] font-semibold text-black/70">Uploading…</p>
                </>
              ) : fileName ? (
                <>
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[rgba(76,175,80,0.14)] text-[#2e6b31]">
                    <FileText aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <p className="mt-3 max-w-full truncate text-[14px] font-semibold text-black">{fileName}</p>
                  <p className="mt-0.5 text-[12px] text-black/50">Ready to submit</p>
                  <button
                    type="button"
                    onClick={onFileClear}
                    className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[#b42d00] transition-colors hover:bg-[rgba(255,61,0,0.08)]"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    <span className="text-[12px] font-semibold">Remove file</span>
                  </button>
                </>
              ) : (
                <>
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-(--brand-primary-strong) text-white">
                    <UploadCloud aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <p className="mt-3 text-[15px] font-semibold text-black">Drop your file here</p>
                  <p className="mt-0.5 text-[12px] text-black/50">PDF, Word or ZIP, up to 20 MB</p>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className={cx(secondaryAction, "mt-4 h-9")}>
                    <span className="text-[13px] font-semibold">Choose a file</span>
                  </button>
                </>
              )}
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-black/70">Notes for your teacher</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Anything they should know, or write your answer here instead of attaching a file."
                className="w-full resize-y rounded-[14px] bg-[#f4f6f9] px-4 py-3 text-[14px] leading-relaxed text-black outline-none ring-1 ring-black/[0.04] transition placeholder:text-black/40 focus:bg-white focus:ring-[rgba(56,193,255,0.55)]"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-[12px] bg-[rgba(255,61,0,0.08)] px-4 py-3 text-[13px] font-medium text-[#b42d00]">
                {error}
              </p>
            )}
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-black/[0.05] px-5 py-4 sm:px-7">
            <button type="button" onClick={onClose} disabled={submitting} className={secondaryAction}>
              <span className="text-[14px] font-semibold">Cancel</span>
            </button>
            <button type="button" onClick={onSubmit} disabled={!canSubmit} className={primaryAction}>
              {submitting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
              <span className="text-[14px] font-semibold">{submitting ? "Submitting…" : "Submit assignment"}</span>
            </button>
          </footer>
        </>
      )}
    </Dialog>
  );
}

function DetailsDialog({ assignment, onClose }: { assignment: AssignmentItem; onClose: () => void }) {
  const score = scoreLabel(assignment);
  const facts = [
    {
      label: "Submitted",
      value: assignment.submission ? longDateFormatter.format(new Date(assignment.submission.submittedAt)) : "Not submitted",
    },
    { label: "Score", value: score ?? "Awaiting grade", highlight: Boolean(score) },
    { label: "Deadline", value: assignment.deadline ? longDateFormatter.format(new Date(assignment.deadline)) : "No deadline" },
    {
      label: "Graded",
      value: assignment.submission?.gradedAt ? longDateFormatter.format(new Date(assignment.submission.gradedAt)) : "Not yet",
    },
  ];

  return (
    <Dialog labelledBy="details-dialog-title" onClose={onClose}>
      <header className="flex items-start justify-between gap-3 border-b border-black/[0.05] px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <CoursePill title={assignment.courseTitle} />
          <h2 id="details-dialog-title" className="mt-2 text-[20px] font-bold leading-snug text-black">
            {assignment.title}
          </h2>
        </div>
        <CloseButton onClick={onClose} />
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
        <dl className="grid grid-cols-2 gap-3">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-[16px] bg-[#f6f9fc] px-4 py-3">
              <dt className="text-[12px] font-semibold text-black/50">{fact.label}</dt>
              <dd className={cx("mt-1 text-[15px] font-semibold tabular-nums", fact.highlight ? "text-[#2e6b31]" : "text-black")}>
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>

        {assignment.submission?.feedback ? (
          <div className="rounded-[16px] bg-[rgba(76,175,80,0.08)] px-4 py-4 ring-1 ring-[rgba(76,175,80,0.2)]">
            <p className="text-[13px] font-semibold text-[#2e6b31]">Teacher feedback</p>
            <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-black/75">{assignment.submission.feedback}</p>
          </div>
        ) : (
          <p className="rounded-[16px] bg-[#f6f9fc] px-4 py-4 text-[13px] text-black/55">
            Your teacher&apos;s feedback will appear here once they grade it.
          </p>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-black/[0.05] px-5 py-4 sm:px-7">
        <button type="button" onClick={onClose} className={secondaryAction}>
          <span className="text-[14px] font-semibold">Close</span>
        </button>
        {assignment.courseSlug && (
          <Link href={`/dashboard/courses/${assignment.courseSlug}`} className={cx(primaryAction, "text-[14px] font-semibold")}>
            Open course
          </Link>
        )}
      </footer>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardAssignmentsPage() {
  const [data, setData] = useState<AssignmentsData>({ upcoming: [], pending: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filter, setFilter] = useState<AssignmentFilter>("all");
  const [now, setNow] = useState(() => Date.now());

  const [submitTarget, setSubmitTarget] = useState<AssignmentItem | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<AssignmentItem | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rewardXp, setRewardXp] = useState(0);
  const [submitError, setSubmitError] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const fetchAssignments = useCallback(async () => {
    try {
      const json = await fetch("/api/users/me/assignments").then((r) => r.json());
      if (json.success) {
        setData(json.data);
        setLoadFailed(false);
      } else {
        setLoadFailed(true);
      }
    } catch (error) {
      console.error("Failed to load assignments", error);
      setLoadFailed(true);
    } finally {
      setLoading(false);
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    // Initial load; the fetch resolves after mount, so its state updates aren't synchronous
    void fetchAssignments();
  }, [fetchAssignments]);

  // Keep "Due in …" labels current while the page stays open
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { todo, submittedItems, overdueCount } = useMemo(() => {
    const pending = [...data.upcoming, ...data.pending].map((a) => toItem(a, now));
    // Overdue first (oldest first), then by deadline, then the ones without a deadline
    pending.sort((a, b) => {
      if (!a.deadline || !b.deadline) return a.deadline ? -1 : b.deadline ? 1 : 0;
      return Date.parse(a.deadline) - Date.parse(b.deadline);
    });
    const done = data.completed
      .map((a) => toItem(a, now))
      .sort((a, b) => Date.parse(b.submission!.submittedAt) - Date.parse(a.submission!.submittedAt));
    return { todo: pending, submittedItems: done, overdueCount: pending.filter((a) => a.state === "overdue").length };
  }, [data, now]);

  const total = todo.length + submittedItems.length;
  const upNext = todo[0] ?? null;

  function openSubmit(assignment: AssignmentItem) {
    setNotes("");
    setFileUrl("");
    setFileName("");
    setSubmitError("");
    setSubmitted(false);
    setRewardXp(0);
    setSubmitTarget(assignment);
  }

  const handleFileSelected = useCallback(async (file: File) => {
    setUploadingFile(true);
    setSubmitError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const json = await fetch("/api/upload/assignments", { method: "POST", body: form }).then((r) => r.json());
      if (json.success && json.data?.url) {
        setFileUrl(json.data.url);
        setFileName(file.name);
      } else {
        setSubmitError(json.message || json.error || "That file couldn't be uploaded. Try again or choose another file.");
      }
    } catch {
      setSubmitError("Upload failed. Check your connection and try again.");
    } finally {
      setUploadingFile(false);
    }
  }, []);

  async function handleSubmit() {
    if (!submitTarget || submitting) return;
    if (!notes.trim() && !fileUrl) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch(`/api/assignments/${submitTarget.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: notes.trim() || undefined, fileUrl: fileUrl || undefined }),
      });
      const json = await response.json();

      if (json.success || response.status === 201) {
        setRewardXp(typeof json?.data?.xpAwarded === "number" ? json.data.xpAwarded : 0);
        setSubmitted(true);
        setTimeout(() => {
          setSubmitTarget(null);
          void fetchAssignments();
        }, 1800);
        return;
      }
      setSubmitError(json.error || json.message || "Your assignment couldn't be submitted. Please try again.");
    } catch (error) {
      console.error("Failed to submit assignment", error);
      setSubmitError("Your assignment couldn't be submitted. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const heroSummary = loading
    ? "Getting your assignments ready."
    : total === 0
      ? "Assignments from your courses will show up here."
      : todo.length === 0
        ? "All caught up. Nothing is waiting to be submitted."
        : `${todo.length} to submit${overdueCount ? `, ${overdueCount} overdue` : ""}. ${submittedItems.length} already submitted.`;

  const rowProps = { now, onSubmit: openSubmit, onDetails: setDetailsTarget };
  const showTodo = filter !== "submitted";
  const showSubmitted = filter !== "todo";

  return (
    <>
    <PageTransition>
      {/* overflow-x-clip, not hidden: hidden makes <main> a scroll container and breaks the sticky rail */}
      <main className="min-h-screen overflow-x-clip bg-[#f9fafb] pb-24 text-black sm:bg-[#f7f5f4] sm:pb-0">
        <section className="mx-auto min-w-0 max-w-[1920px] space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-6 lg:px-[38px] lg:py-[18px] xl:pr-10">
          <RevealSection>
            <PageHero
              eyebrow="Assignments"
              title="Your Assignments"
              description={<p>{heroSummary}</p>}
              aside={
                loading ? undefined : upNext ? (
                  <div className="rounded-[20px] bg-white p-5 text-black shadow-[0_12px_30px_rgba(8,80,130,0.18)] sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className={cx(pill, "bg-(--brand-primary-soft)", brandInk)}>Up next</span>
                      {upNext.points > 0 && <span className="text-[12px] font-medium text-black/50">{upNext.points} points</span>}
                    </div>
                    <p className="mt-3 line-clamp-2 text-[17px] font-bold leading-snug">{upNext.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <CoursePill title={upNext.courseTitle} />
                      <StatusPill assignment={upNext} now={now} />
                    </div>
                    <div className="mt-5 flex gap-2">
                      <button type="button" onClick={() => openSubmit(upNext)} className={cx(primaryAction, "flex-1")}>
                        <span className="text-[14px] font-semibold">Submit now</span>
                      </button>
                      {upNext.attachmentUrl && (
                        <a href={upNext.attachmentUrl} target="_blank" rel="noreferrer" className={cx(secondaryAction, "text-[14px] font-semibold")}>
                          <FileText aria-hidden="true" className="h-4 w-4" />
                          Brief
                        </a>
                      )}
                    </div>
                  </div>
                ) : total > 0 ? (
                  <div className="flex items-center gap-4 rounded-[20px] bg-white p-5 text-black shadow-[0_12px_30px_rgba(8,80,130,0.18)] sm:p-6">
                    <Image alt="" className="h-20 w-20 shrink-0 scale-[1.3] object-contain" height={160} src={art.submitted} width={160} />
                    <div>
                      <p className="text-[16px] font-bold">All caught up</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-black/55">New assignments from your teachers will appear here.</p>
                    </div>
                  </div>
                ) : undefined
              }
            />
          </RevealSection>

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_293px] xl:items-start">
            <div className="min-w-0 space-y-8">
              <RevealSection delay={0.06}>
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
                  <div>
                    <h2 className={sectionTitle}>Assignments</h2>
                    <p className={sectionLede}>Submit before the deadline, then check back for your grade.</p>
                  </div>
                  {total > 0 && (
                    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                      <FilterChip active={filter === "all"} count={total} label="All" onClick={() => setFilter("all")} />
                      <FilterChip active={filter === "todo"} count={todo.length} label="To submit" onClick={() => setFilter("todo")} />
                      <FilterChip active={filter === "submitted"} count={submittedItems.length} label="Submitted" onClick={() => setFilter("submitted")} />
                    </div>
                  )}
                </div>
              </RevealSection>

              {loading ? (
                <ListSkeleton />
              ) : loadFailed && total === 0 ? (
                <EmptyState
                  title="Couldn't load your assignments"
                  description="Check your connection and try again."
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setLoading(true);
                        void fetchAssignments();
                      }}
                      className={primaryAction}
                    >
                      <span className="text-[14px] font-semibold">Try again</span>
                    </button>
                  }
                />
              ) : total === 0 ? (
                <div className={cx(card, "flex flex-col items-center px-6 py-12 text-center")}>
                  <Image alt="" className="h-28 w-28 scale-[1.3] object-contain" height={224} src={art.todo} width={224} />
                  <p className="mt-4 text-[18px] font-bold text-black">No assignments yet</p>
                  <p className="mt-1.5 max-w-[44ch] text-[14px] leading-relaxed text-black/55">
                    When your teachers publish assignments in your courses, they&apos;ll appear here with their deadlines.
                  </p>
                </div>
              ) : (
                <>
                  {showTodo && (
                    <RevealSection delay={0.08}>
                      <section aria-labelledby="todo-heading" className="space-y-3">
                        <h3 id="todo-heading" className="text-[15px] font-bold text-black">
                          To Submit <span className="font-semibold text-black/40">{todo.length}</span>
                        </h3>
                        {todo.length === 0 ? (
                          <p className={cx(card, "px-6 py-8 text-center text-[14px] text-black/55")}>
                            Nothing to submit right now.
                          </p>
                        ) : (
                          <ol className={cx(card, "divide-y divide-black/[0.05]")}>
                            {todo.map((assignment) => (
                              <AssignmentRow key={assignment.id} assignment={assignment} {...rowProps} />
                            ))}
                          </ol>
                        )}
                      </section>
                    </RevealSection>
                  )}

                  {showSubmitted && (
                    <RevealSection delay={0.1}>
                      <section aria-labelledby="submitted-heading" className="space-y-3">
                        <h3 id="submitted-heading" className="text-[15px] font-bold text-black">
                          Submitted <span className="font-semibold text-black/40">{submittedItems.length}</span>
                        </h3>
                        {submittedItems.length === 0 ? (
                          <p className={cx(card, "px-6 py-8 text-center text-[14px] text-black/55")}>
                            Submitted work and grades will appear here.
                          </p>
                        ) : (
                          <ol className={cx(card, "divide-y divide-black/[0.05]")}>
                            {submittedItems.map((assignment) => (
                              <AssignmentRow key={assignment.id} assignment={assignment} {...rowProps} />
                            ))}
                          </ol>
                        )}
                      </section>
                    </RevealSection>
                  )}
                </>
              )}
            </div>

            <aside
              aria-labelledby="assignment-summary-heading"
              className="order-first min-w-0 space-y-4 xl:sticky xl:top-[calc(var(--app-header-height)+1.5rem)] xl:order-none"
            >
              <div className="sr-only xl:not-sr-only">
                <h2 id="assignment-summary-heading" className={sectionTitle}>
                  At a Glance
                </h2>
                <p className={sectionLede}>Where your assignments stand.</p>
              </div>
              <StaggerGrid className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-1">
                <StatCard image={art.todo} label="To submit" value={loading ? "–" : String(todo.length)} note="Not handed in yet" />
                <StatCard image={art.overdue} label="Overdue" value={loading ? "–" : String(overdueCount)} note="Past the deadline" />
                <StatCard image={art.submitted} label="Submitted" value={loading ? "–" : String(submittedItems.length)} note="Sent for grading" />
              </StaggerGrid>
            </aside>
          </div>
        </section>
      </main>
    </PageTransition>

      {/* Outside PageTransition: its entrance transform would pin fixed dialogs to it */}
      <AnimatePresence>
        {submitTarget && (
          <SubmitDialog
            assignment={submitTarget}
            now={now}
            onClose={() => setSubmitTarget(null)}
            onSubmit={() => void handleSubmit()}
            notes={notes}
            setNotes={setNotes}
            submitting={submitting}
            submitted={submitted}
            rewardXp={rewardXp}
            error={submitError}
            fileName={fileName}
            fileUrl={fileUrl}
            uploadingFile={uploadingFile}
            onFileSelected={handleFileSelected}
            onFileClear={() => {
              setFileUrl("");
              setFileName("");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailsTarget && <DetailsDialog assignment={detailsTarget} onClose={() => setDetailsTarget(null)} />}
      </AnimatePresence>
    </>
  );
}
