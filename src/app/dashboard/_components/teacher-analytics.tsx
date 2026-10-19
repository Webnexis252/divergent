"use client";

import { m as motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef, useCallback } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  AlertOctagon,
  ChartLine,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CirclePlay,
  Clock3,
  MessageCircleQuestion,
  RefreshCw,
  TriangleAlert,
  Trophy,
  UserMinus,
  Users,
} from "lucide-react";
import { AnimCard, PageTransition, RevealSection, StaggerGrid } from "./motion-wrappers";
import { EnrollmentTrendChart } from "./enrollment-trend-chart";
import type { TrendPoint } from "./enrollment-trend-chart";
import { SegmentedControl } from "./segmented-control";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const whole = new Intl.NumberFormat("en-IN");
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

type AnalyticsData = {
  metrics: {
    activeStudents: number;
    doubtsResolved: number;
    totalDoubts: number;
    openDoubts: number;
    videoCompletionRate: number;
    dropOffRate: number;
  };
  doubtResponse?: { asked: number; answered: number; withinTwoHours: number; medianMinutes: number | null };
  trendData: TrendPoint[];
  previousEnrollments?: number;
  topStudents: { id: string; name: string; detail: string }[];
  needsAttention: { id: string; name: string; detail: string; streakCount: number }[];
  needsAttentionCount?: number;
};

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} min`;
  return `${(minutes / 60).toFixed(minutes < 600 ? 1 : 0)} h`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type CourseOption = {
  id: string;
  title: string;
  cohorts: { id: string; name: string }[];
};

const RANGE_OPTIONS = [7, 14, 30, 90].map((d) => ({
  id: String(d),
  label: `${d}D`,
  ariaLabel: `Last ${d} days`,
}));

// ─── Status tones ─────────────────────────────────────────────────────────────

type Status = "good" | "warning" | "critical" | "neutral";

const STATUS_STYLES: Record<Status, { badge: string; meter: string; track: string; icon: ComponentType<{ className?: string }> }> = {
  good: { badge: "bg-[#ecfdf3] text-[#15803d]", meter: "bg-[#16a34a]", track: "bg-[#dcfce7]", icon: CircleCheck },
  warning: { badge: "bg-[#fffbeb] text-[#b45309]", meter: "bg-[#f59e0b]", track: "bg-[#fef3c7]", icon: TriangleAlert },
  critical: { badge: "bg-[#fef2f2] text-[#b91c1c]", meter: "bg-[#ef4444]", track: "bg-[#fee2e2]", icon: AlertOctagon },
  neutral: { badge: "bg-[#f1f5f9] text-[#475569]", meter: "bg-[#64748b]", track: "bg-[#e2e8f0]", icon: CircleCheck },
};

function StatusBadge({ status, children }: { status: Status; children: ReactNode }) {
  const { badge, icon: Icon } = STATUS_STYLES[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

function Meter({ value, status, label }: { value: number; status: Status; label: string }) {
  const { meter, track } = STATUS_STYLES[status];
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full ${track}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <motion.div
        className={`h-full rounded-full ${meter}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        transition={{ duration: 0.7, ease }}
      />
    </div>
  );
}

const ICON_TONES = {
  sky: "bg-[#e0f2fe] text-[#0284c7]",
  violet: "bg-[#ede9fe] text-[#6d28d9]",
  amber: "bg-[#fef3c7] text-[#b45309]",
  emerald: "bg-[#dcfce7] text-[#15803d]",
  rose: "bg-[#ffe4e6] text-[#be123c]",
} as const;

function IconChip({ icon: Icon, tone }: { icon: ComponentType<{ className?: string }>; tone: keyof typeof ICON_TONES }) {
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${ICON_TONES[tone]}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

// ─── Reusable dropdown ────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open?: boolean }) {
  return (
    <motion.svg
      className="h-4 w-4 shrink-0 text-[#64748b]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.2 }}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </motion.svg>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  disabled,
  hideLabel,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const selected = options.find((o) => o.id === value);

  return (
    <div className="min-w-0 space-y-2" ref={ref}>
      <p className={hideLabel ? "sr-only" : "text-[12px] font-semibold text-[#475569]"}>{label}</p>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${label}: ${selected?.label ?? value}`}
          className={`flex h-11 w-full items-center justify-between gap-2 rounded-[12px] border bg-white px-3.5 text-left text-[14px] font-medium text-[#0f172a] transition-colors ${
            open ? "border-[#209bd2] ring-3 ring-[#38c1ff]/20" : "border-[#e2e8f0] hover:border-[#cbd5e1]"
          } ${disabled ? "cursor-not-allowed bg-[#f8fafc] text-[#94a3b8]" : "cursor-pointer"}`}
          onClick={() => !disabled && setOpen((o) => !o)}
        >
          <span className="truncate">{selected?.label ?? value}</span>
          <ChevronIcon open={open} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              role="listbox"
              aria-label={label}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.16, ease }}
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-[14px] border border-[#e2e8f0] bg-white p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
            >
              {options.map((opt) => {
                const isSelected = value === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[14px] transition-colors ${
                      isSelected ? "font-semibold text-[#0f172a]" : "text-[#334155] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <svg
                      className={`h-4 w-4 shrink-0 text-[#209bd2] ${isSelected ? "" : "invisible"}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.75"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────

type MetricConfig = {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: keyof typeof ICON_TONES;
  note: string;
  status?: { tone: Status; label: string };
  meter?: number;
};

function AnalyticsMetricCard({ title, value, icon, tone, note, status, meter }: MetricConfig) {
  return (
    <AnimCard className="h-full rounded-[20px] border border-[#e8edf3] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <IconChip icon={icon} tone={tone} />
        {status && <StatusBadge status={status.tone}>{status.label}</StatusBadge>}
      </div>
      <p className="mt-5 text-[13px] font-medium text-[#64748b]">{title}</p>
      <p className="mt-1.5 text-[30px] font-semibold leading-none tracking-[-0.03em] text-[#0f172a]">{value}</p>
      {typeof meter === "number" && (
        <div className="mt-4">
          <Meter value={meter} status={status?.tone ?? "neutral"} label={title} />
        </div>
      )}
      <p className="mt-3 text-[12px] leading-5 text-[#64748b]">{note}</p>
    </AnimCard>
  );
}

// ─── Doubt response ───────────────────────────────────────────────────────────

function DoubtResponseCard({
  response,
  openDoubts,
  days,
}: {
  response?: AnalyticsData["doubtResponse"];
  openDoubts: number;
  days: number;
}) {
  const withinTwoHoursPct =
    response && response.asked > 0 ? Math.round((response.withinTwoHours / response.asked) * 100) : null;
  const speedStatus: Status =
    withinTwoHoursPct === null ? "neutral" : withinTwoHoursPct >= 80 ? "good" : withinTwoHoursPct >= 50 ? "warning" : "critical";

  return (
    <section className="flex h-full flex-col rounded-[24px] border border-[#e8edf3] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex items-start gap-3">
        <IconChip icon={Clock3} tone="violet" />
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">Doubt response</h2>
          <p className="mt-1 text-[13px] text-[#64748b]">How fast students get a first answer</p>
        </div>
      </div>

      <div className="mt-6 rounded-[18px] bg-[linear-gradient(135deg,#f5f3ff_0%,#f8fafc_100%)] p-5">
        <p className="text-[12px] font-medium text-[#64748b]">Median time to first reply</p>
        <p className="mt-2 text-[40px] font-semibold leading-none tracking-[-0.04em] text-[#0f172a]">
          {formatMinutes(response?.medianMinutes ?? null)}
        </p>
        <p className="mt-2 text-[12px] text-[#64748b]">First reply from a mentor, AI answers excluded</p>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-medium text-[#334155]">Answered within 2 hours</p>
          {withinTwoHoursPct === null ? (
            <span className="text-[13px] text-[#94a3b8]">No doubts yet</span>
          ) : (
            <StatusBadge status={speedStatus}>{withinTwoHoursPct}%</StatusBadge>
          )}
        </div>
        <div className="mt-3">
          <Meter value={withinTwoHoursPct ?? 0} status={speedStatus} label="Doubts answered within 2 hours" />
        </div>
      </div>

      <div className="min-h-6 flex-1" />
      <dl className="grid grid-cols-3 gap-3 border-t border-[#eef1f5] pt-5">
        {[
          { label: "Asked", value: response?.asked ?? 0 },
          { label: "Answered", value: response?.answered ?? 0 },
          { label: "Open now", value: openDoubts },
        ].map((item) => (
          <div key={item.label}>
            <dt className="text-[12px] text-[#64748b]">{item.label}</dt>
            <dd className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-[#0f172a]">{whole.format(item.value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] text-[#94a3b8]">Asked and answered cover the last {days} days</p>
    </section>
  );
}

// ─── Student lists ────────────────────────────────────────────────────────────

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  const buttonClass =
    "grid h-8 w-8 place-items-center rounded-[10px] border border-[#e2e8f0] bg-white text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="mt-4 flex items-center justify-between border-t border-[#eef1f5] pt-4">
      <span className="text-[12px] font-medium text-[#64748b]">
        Page {page + 1} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button type="button" className={buttonClass} disabled={page === 0} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={page === totalPages - 1}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function StudentStatusPanel({
  title,
  subtitle,
  tone,
  students,
  count,
}: {
  title: string;
  subtitle: string;
  tone: "attention" | "top";
  students: { id: string; name: string; detail: string }[];
  count?: number;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 8;
  const totalPages = Math.ceil(students.length / pageSize);
  const current = Math.min(page, Math.max(totalPages - 1, 0));
  const paginatedStudents = students.slice(current * pageSize, (current + 1) * pageSize);
  const attention = tone === "attention";

  return (
    <section className="flex h-full flex-col rounded-[24px] border border-[#e8edf3] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <IconChip icon={attention ? TriangleAlert : Trophy} tone={attention ? "rose" : "emerald"} />
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">{title}</h2>
            <p className="mt-1 text-[13px] text-[#64748b]">{subtitle}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-[#f1f5f9] px-2.5 py-1 text-[12px] font-semibold text-[#334155]">
          {whole.format(count ?? students.length)}
        </span>
      </div>

      <div className="mt-5 flex-1">
        {students.length === 0 ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-[16px] border border-dashed border-[#e2e8f0] px-6 text-center">
            <span className="text-[14px] font-semibold text-[#334155]">
              {attention ? "Everyone is on track" : "No top performers yet"}
            </span>
            <span className="mt-1 text-[12px] text-[#64748b]">
              {attention
                ? "No students are below 40% overall performance."
                : "Students will appear here as they complete tests and earn XP."}
            </span>
          </div>
        ) : (
          <ul className="divide-y divide-[#f1f5f9]">
            {paginatedStudents.map((student, index) => (
              <motion.li
                key={`${student.id}-${current}-${index}`}
                className="flex items-center justify-between gap-4 py-3"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease, delay: index * 0.03 }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${
                      attention ? "bg-[#f1f5f9] text-[#334155]" : "bg-[#dcfce7] text-[#15803d]"
                    }`}
                  >
                    {initials(student.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[#0f172a]">{student.name}</p>
                    <p className="truncate text-[12px] text-[#64748b]">{student.detail}</p>
                  </div>
                </div>
                {attention ? (
                  <StatusBadge status="critical">Follow up</StatusBadge>
                ) : (
                  <span className="shrink-0 text-[12px] font-semibold text-[#94a3b8]">
                    #{current * pageSize + index + 1}
                  </span>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <Pager page={current} totalPages={totalPages} onChange={setPage} />
    </section>
  );
}

// ─── Exam Leaderboard ────────────────────────────────────────────────────────

type LeaderboardData = {
  id: string;
  title: string;
  courseTitle: string;
  topStudents: {
    id: string;
    name: string;
    image: string | null;
    score: number;
    totalPoints: number;
  }[];
};

const RANK_STYLES = [
  "bg-[#fef3c7] text-[#b45309] ring-1 ring-[#fde68a]",
  "bg-[#f1f5f9] text-[#475569] ring-1 ring-[#e2e8f0]",
  "bg-[#ffedd5] text-[#c2410c] ring-1 ring-[#fed7aa]",
];

function ExamLeaderboard() {
  const [leaderboards, setLeaderboards] = useState<LeaderboardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string>("all");

  useEffect(() => {
    fetch("/api/teacher/analytics/leaderboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setLeaderboards(json.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const examOptions = leaderboards.map((l) => ({ id: l.id, label: `${l.title} · ${l.courseTitle}` }));
  const activeLeaderboard = leaderboards.find((l) => l.id === selectedExamId) || leaderboards[0];

  return (
    <section className="rounded-[24px] border border-[#e8edf3] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <IconChip icon={Trophy} tone="amber" />
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">Exam leaderboard</h2>
            <p className="mt-1 text-[13px] text-[#64748b]">Top 10 scorers for each exam</p>
          </div>
        </div>
        {examOptions.length > 0 && activeLeaderboard && (
          <div className="w-full sm:w-80">
            <FilterDropdown
              label="Exam"
              hideLabel
              value={activeLeaderboard.id}
              options={examOptions}
              onChange={setSelectedExamId}
            />
          </div>
        )}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[60px] animate-pulse rounded-[14px] bg-[#f1f5f9]" />
            ))}
          </div>
        ) : !activeLeaderboard ? (
          <p className="rounded-[16px] border border-dashed border-[#e2e8f0] py-10 text-center text-[13px] text-[#64748b]">
            No exams found.
          </p>
        ) : activeLeaderboard.topStudents.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-[#e2e8f0] py-10 text-center text-[13px] text-[#64748b]">
            No attempts for this exam yet.
          </p>
        ) : (
          <ol className="grid gap-x-6 gap-y-2 lg:grid-cols-2">
            {activeLeaderboard.topStudents.map((student, idx) => {
              const pct = Math.round((student.score / Math.max(student.totalPoints, 1)) * 100);
              return (
                <motion.li
                  key={`${activeLeaderboard.id}-${student.id}-${idx}`}
                  className="flex items-center gap-3 rounded-[14px] border border-[#f1f5f9] bg-[#fbfcfd] px-3 py-2.5"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.03 }}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                      RANK_STYLES[idx] ?? "text-[#94a3b8]"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[#e2e8f0] bg-white">
                    {student.image ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={student.image} alt="" className="h-full w-full object-cover" />
                      </>
                    ) : (
                      <span className="grid h-full w-full place-items-center bg-[#e0f2fe] text-[11px] font-semibold text-[#0369a1]">
                        {initials(student.name)}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[#0f172a]">{student.name}</p>
                    <p className="text-[12px] tabular-nums text-[#64748b]">
                      {student.score} / {student.totalPoints} points
                    </p>
                  </div>
                  <div className="flex w-[96px] shrink-0 flex-col items-end gap-1.5">
                    <span className="text-[13px] font-semibold tabular-nums text-[#0f172a]">{pct}%</span>
                    <span className="h-1.5 w-full overflow-hidden rounded-full bg-[#e0f2fe]">
                      <span className="block h-full rounded-full bg-[#209bd2]" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

// ─── Active filters pill strip ────────────────────────────────────────────────

function ActiveFilterPills({
  courseLabel,
  cohortLabel,
  onClearCourse,
  onClearCohort,
}: {
  courseLabel?: string;
  cohortLabel?: string;
  onClearCourse: () => void;
  onClearCohort: () => void;
}) {
  const pills = [
    courseLabel && { label: `Course: ${courseLabel}`, onClear: onClearCourse },
    cohortLabel && { label: `Batch: ${cohortLabel}`, onClear: onClearCohort },
  ].filter(Boolean) as { label: string; onClear: () => void }[];

  if (pills.length === 0) return null;

  return (
    <motion.div
      className="flex flex-wrap items-center gap-2 border-t border-[#eef1f5] pt-4"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <span className="text-[12px] font-medium text-[#64748b]">Filtered by</span>
      {pills.map((pill) => (
        <span
          key={pill.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#bae6fd] bg-[#f0f9ff] py-1 pl-3 pr-1.5 text-[12px] font-semibold text-[#0369a1]"
        >
          {pill.label}
          <button
            type="button"
            onClick={pill.onClear}
            aria-label={`Clear ${pill.label}`}
            className="rounded-full p-0.5 transition-colors hover:bg-[#bae6fd]"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
    </motion.div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DashboardSkeleton() {
  const block = "animate-pulse rounded-[24px] border border-[#eef1f5] bg-white/80";
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-[188px] rounded-[20px]`} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className={`${block} h-[470px] xl:col-span-2`} />
        <div className={`${block} h-[470px]`} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className={`${block} h-[320px]`} />
        <div className={`${block} h-[320px]`} />
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SharedAnalyticsDashboard({
  title = "Class Analytics",
  subtitle = "Live engagement metrics, top performers, and students who need follow-up.",
  label = "Teacher Analytics",
}: {
  title?: string;
  subtitle?: string;
  label?: string;
}) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [days, setDays] = useState(7);
  // `days` the loaded data was computed for, so labels never run ahead of the numbers mid-refetch
  const [loadedDays, setLoadedDays] = useState(7);
  const requestId = useRef(0);

  // Filter state
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [selectedCohortId, setSelectedCohortId] = useState<string>("all");

  // Load filter options once
  useEffect(() => {
    fetch("/api/teacher/analytics/filters")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCourses(json.data.courses);
      })
      .catch(console.error);
  }, []);

  // A batch belongs to one course, so changing the course clears it
  const selectCourse = (id: string) => {
    setSelectedCourseId(id);
    setSelectedCohortId("all");
  };

  // Fetch analytics whenever filters change
  const fetchAnalytics = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (selectedCourseId !== "all") params.set("courseId", selectedCourseId);
    if (selectedCohortId !== "all") params.set("cohortId", selectedCohortId);

    fetch(`/api/teacher/analytics?${params}`)
      .then((r) => r.json())
      .then((json) => {
        // A slower response for an older filter must not overwrite a newer one
        if (id !== requestId.current) return;
        if (json.success) {
          setAnalytics(json.data);
          setLoadedDays(days);
          setUpdatedAt(new Date());
          setError(false);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        console.error(err);
        if (id === requestId.current) setError(true);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [days, selectedCourseId, selectedCohortId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnalytics();
  }, [fetchAnalytics]);

  const m = analytics?.metrics;
  const needsAttentionShown = analytics?.needsAttention.length ?? 0;
  const needsAttentionTotal = analytics?.needsAttentionCount ?? needsAttentionShown;

  // Build dropdown options
  const courseOptions = [
    { id: "all", label: "All courses" },
    ...courses.map((c) => ({ id: c.id, label: c.title })),
  ];

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const cohortOptions = [
    { id: "all", label: "All batches" },
    ...(selectedCourse?.cohorts.map((c) => ({ id: c.id, label: c.name })) ?? []),
  ];

  const completionStatus: Status = !m
    ? "neutral"
    : m.videoCompletionRate >= 70
      ? "good"
      : m.videoCompletionRate >= 40
        ? "warning"
        : "critical";
  const dropOffStatus: Status = !m ? "neutral" : m.dropOffRate < 20 ? "good" : m.dropOffRate < 40 ? "warning" : "critical";

  const metricCards: MetricConfig[] = m
    ? [
        {
          title: "Active students",
          value: whole.format(m.activeStudents),
          icon: Users,
          tone: "sky",
          note: "Unique students with an active enrollment",
        },
        {
          title: "Video completion",
          value: `${m.videoCompletionRate}%`,
          icon: CirclePlay,
          tone: "violet",
          status: {
            tone: completionStatus,
            label: completionStatus === "good" ? "On track" : completionStatus === "warning" ? "Below target" : "Low",
          },
          meter: m.videoCompletionRate,
          note: `Lessons completed of those started in the last ${loadedDays} days`,
        },
        {
          title: "Drop-off rate",
          value: `${m.dropOffRate}%`,
          icon: UserMinus,
          tone: "amber",
          status: {
            tone: dropOffStatus,
            label: dropOffStatus === "good" ? "Healthy" : dropOffStatus === "warning" ? "Watch" : "High",
          },
          meter: m.dropOffRate,
          note: `Active students with no lesson activity in the last ${loadedDays} days`,
        },
        {
          title: "Doubts resolved",
          value: whole.format(m.doubtsResolved),
          icon: MessageCircleQuestion,
          tone: "emerald",
          status:
            m.openDoubts > 0
              ? { tone: "warning", label: `${whole.format(m.openDoubts)} open` }
              : { tone: "good", label: "All clear" },
          note: `${whole.format(m.totalDoubts)} doubts raised in the last ${loadedDays} days`,
        },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Page header */}
      <RevealSection>
        <header className="flex flex-col gap-5 pt-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d7ecff] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#209bd2]">
              <ChartLine className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </span>
            <h1 className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#0f172a] sm:text-[40px]">
              {title}
            </h1>
            <p className="mt-2 max-w-[640px] text-[15px] leading-6 text-[#64748b]">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 text-[13px] text-[#64748b]" aria-live="polite">
              <span className={`h-2 w-2 rounded-full ${error ? "bg-[#ef4444]" : "bg-[#22c55e]"}`} aria-hidden="true" />
              {error ? "Couldn't refresh" : updatedAt ? `Updated ${timeFmt.format(updatedAt)}` : "Loading…"}
            </span>
            <button
              type="button"
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#e2e8f0] bg-white px-4 text-[13px] font-semibold text-[#0f172a] shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-colors hover:border-[#cbd5e1] hover:bg-[#f8fafc] disabled:cursor-wait"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </header>
      </RevealSection>

      {/* Filter bar: scopes everything below it */}
      <RevealSection delay={0.04} className="relative z-20">
        <section className="space-y-4 rounded-[20px] border border-[#e8edf3] bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-[#475569]">Time range</p>
              <SegmentedControl
                ariaLabel="Time range"
                className="w-full lg:w-auto"
                value={String(days)}
                options={RANGE_OPTIONS}
                onChange={(id) => setDays(Number(id))}
              />
            </div>
            <FilterDropdown label="Course" value={selectedCourseId} options={courseOptions} onChange={selectCourse} />
            <FilterDropdown
              label="Batch"
              value={selectedCohortId}
              options={cohortOptions}
              onChange={setSelectedCohortId}
              disabled={selectedCourseId === "all"}
            />
          </div>

          <ActiveFilterPills
            courseLabel={selectedCourse?.title}
            cohortLabel={selectedCourse?.cohorts.find((c) => c.id === selectedCohortId)?.name}
            onClearCourse={() => selectCourse("all")}
            onClearCohort={() => setSelectedCohortId("all")}
          />
        </section>
      </RevealSection>

      {!analytics ? (
        error ? (
          <div className="rounded-[24px] border border-[#fecaca] bg-white p-10 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="text-[16px] font-semibold text-[#0f172a]">Analytics couldn&apos;t be loaded</p>
            <p className="mt-1 text-[13px] text-[#64748b]">Check your connection and try again.</p>
            <button
              type="button"
              onClick={fetchAnalytics}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#0f172a] px-4 text-[13px] font-semibold text-white hover:bg-[#1e293b]"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : (
          <DashboardSkeleton />
        )
      ) : (
        // A refetch keeps the current numbers on screen, dimmed, instead of flashing a spinner
        <div
          className={`space-y-6 transition-opacity duration-300 ${loading ? "pointer-events-none opacity-60" : "opacity-100"}`}
          aria-busy={loading}
        >
          <StaggerGrid className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((metric) => (
              <AnalyticsMetricCard key={metric.title} {...metric} />
            ))}
          </StaggerGrid>

          <RevealSection delay={0.06}>
            <div className="grid gap-6 xl:grid-cols-3">
              <div className="min-w-0 xl:col-span-2">
                <EnrollmentTrendChart
                  data={analytics.trendData}
                  days={loadedDays}
                  previousTotal={analytics.previousEnrollments}
                />
              </div>
              <DoubtResponseCard response={analytics.doubtResponse} openDoubts={m?.openDoubts ?? 0} days={loadedDays} />
            </div>
          </RevealSection>

          <RevealSection delay={0.08}>
            <div className="grid gap-6 xl:grid-cols-2">
              <StudentStatusPanel
                title="Needs attention"
                subtitle={
                  needsAttentionTotal > needsAttentionShown
                    ? `Below 40% overall performance · lowest ${needsAttentionShown} of ${whole.format(needsAttentionTotal)}`
                    : "Students below 40% overall performance"
                }
                tone="attention"
                students={analytics.needsAttention}
                count={needsAttentionTotal}
              />
              <StudentStatusPanel
                title="Top performers"
                subtitle="Highest scorers in each course"
                tone="top"
                students={analytics.topStudents}
              />
            </div>
          </RevealSection>

          <RevealSection delay={0.1}>
            <ExamLeaderboard />
          </RevealSection>
        </div>
      )}
    </div>
  );
}

export function TeacherAnalytics() {
  return (
    <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-6 px-3 pb-14 pt-4 sm:px-6 sm:pt-6 lg:gap-8 lg:px-0 lg:pt-8">

          <main className="lg:pr-[160px]">
            <SharedAnalyticsDashboard />
          </main>
        </div>
    </PageTransition>
  );
}
