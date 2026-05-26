"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  AnimCard,
  AnimStat,
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "./motion-wrappers";
import { TeacherSidebar } from "./teacher-sidebar";
import { TeacherTopBar } from "./teacher-top-bar";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type AnalyticsData = {
  metrics: {
    activeStudents: number;
    doubtsResolved: number;
    totalDoubts: number;
    openDoubts: number;
    videoCompletionRate: number;
    dropOffRate: number;
  };
  trendData: { label: string; value: number }[];
  topStudents: { id: string; name: string; detail: string }[];
  needsAttention: { id: string; name: string; detail: string; streakCount: number }[];
};

type CourseOption = {
  id: string;
  title: string;
  cohorts: { id: string; name: string }[];
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open?: boolean }) {
  return (
    <motion.svg
      className="h-4 w-4 text-[#6b7280] shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <path d="m6 9 6 6 6-6" />
    </motion.svg>
  );
}

function TrendUpIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 15 5-5 4 4 5-7" /><path d="M14 7h5v5" />
    </svg>
  );
}

function TrendDownIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 9 5 5 4-4 5 7" /><path d="M14 17h5v-5" />
    </svg>
  );
}

// ─── Reusable dropdown ────────────────────────────────────────────────────────

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const selected = options.find((o) => o.id === value);

  return (
    <div className="space-y-2" ref={ref}>
      <p className="text-[13px] font-medium text-[#4b5563]">{label}</p>
      <div className="relative">
        <motion.button
          type="button"
          disabled={disabled}
          className={`flex h-12 w-full items-center justify-between rounded-[16px] border bg-white px-4 text-left text-[14px] font-medium shadow-[0_8px_24px_rgba(15,23,42,0.04)] transition-colors ${
            open
              ? "border-[#38c1ff] ring-2 ring-[#38c1ff]/20 text-[#111827]"
              : "border-[#d9e1ec] text-[#111827] hover:border-[#b0c4d8]"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          whileHover={disabled ? {} : { y: -1 }}
          whileTap={disabled ? {} : { scale: 0.99 }}
          transition={{ duration: 0.15 }}
          onClick={() => !disabled && setOpen((o) => !o)}
        >
          <span className="truncate">{selected?.label ?? value}</span>
          <ChevronIcon open={open} />
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.18, ease }}
              className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-60 overflow-y-auto rounded-[16px] border border-[#e5e9f2] bg-white py-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
            >
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] transition-colors ${
                    value === opt.id
                      ? "bg-[#f0f9ff] font-semibold text-[#0284c7]"
                      : "text-[#111827] hover:bg-[#f8fbff]"
                  }`}
                >
                  {value === opt.id && (
                    <svg className="h-3.5 w-3.5 shrink-0 text-[#0284c7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                  <span className={value === opt.id ? "" : "ml-5"}>{opt.label}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Metric card config ───────────────────────────────────────────────────────

type MetricConfig = {
  title: string;
  value: string | number;
  delta: string;
  deltaTone: string;
  accent: string;
  note: string;
  progress?: number;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AnalyticsMetricCard({ title, value, delta, deltaTone, accent, progress, note }: MetricConfig) {
  const isPositive = !delta.startsWith("-");
  return (
    <AnimCard className="h-full rounded-[24px] border border-[#edf0f5] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="relative overflow-hidden rounded-[24px] px-5 py-5">
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${accent}`} />
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <p className="text-[14px] font-medium text-[#4b5563]">{title}</p>
            <AnimStat className="mt-3 text-[34px] font-semibold leading-none tracking-[-0.04em] text-[#111827]">
              {value}
            </AnimStat>
          </div>
          <motion.div
            className={`inline-flex items-center gap-1 rounded-full bg-[#f8fafc] px-3 py-1 text-[12px] font-semibold ${deltaTone}`}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          >
            {isPositive ? <TrendUpIcon /> : <TrendDownIcon />}
            {delta}
          </motion.div>
        </div>

        {typeof progress === "number" && (
          <div className="mt-6">
            <div className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
              <motion.div
                className="h-full rounded-full bg-[#111827]"
                initial={{ width: 0 }}
                whileInView={{ width: `${progress}%` }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.7, ease }}
              />
            </div>
          </div>
        )}

        <p className="mt-4 text-[12px] text-[#6b7280]">{note}</p>
      </div>
    </AnimCard>
  );
}

function AnalyticsChart({ trendData, days }: { trendData: { label: string; value: number }[], days: number }) {
  const maxVal = Math.max(...trendData.map((d) => d.value), 1);
  const points = trendData
    .map((d, i) => `${i * (560 / Math.max(trendData.length - 1, 1)) + 20},${170 - (d.value / maxVal) * 130}`)
    .join(" ");

  return (
    <div className="rounded-[26px] border border-[#edf0f5] bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[26px] font-semibold tracking-[-0.03em] text-[#111827]">Enrollment Trend</p>
          <p className="mt-1 text-[14px] text-[#6b7280]">New student enrollments over the last {days} days.</p>
        </div>
        <motion.div
          className="inline-flex items-center gap-2 self-start rounded-full bg-[#ecfdf3] px-3 py-1 text-[12px] font-semibold text-[#16a34a]"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <TrendUpIcon />
          Live data
        </motion.div>
      </div>

      <div className="mt-8 overflow-hidden rounded-[22px] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[44px_minmax(0,1fr)]">
          <div className="hidden justify-between py-2 text-[11px] text-[#9ca3af] lg:flex lg:flex-col">
            <span>{maxVal}</span>
            <span>{Math.round(maxVal * 0.75)}</span>
            <span>{Math.round(maxVal * 0.5)}</span>
            <span>{Math.round(maxVal * 0.25)}</span>
            <span>0</span>
          </div>
          <div>
            <svg viewBox="0 0 620 220" className="h-[200px] w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="enroll-fill" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#38c1ff" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#38c1ff" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[40, 80, 120, 160].map((y) => (
                <line key={y} x1="0" y1={y} x2="620" y2={y} stroke="#e5e7eb" strokeDasharray="6 8" />
              ))}
              {trendData.length > 1 && (
                <>
                  <motion.path
                    key={`fill-${days}`}
                    d={`M20,220 L${points.split(" ")[0].split(",")[0]},${170 - (trendData[0].value / maxVal) * 130} ${points} L${20 + (trendData.length - 1) * (560 / Math.max(trendData.length - 1, 1))},220 Z`}
                    fill="url(#enroll-fill)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, ease }}
                  />
                  <motion.polyline
                    key={`line-${days}`}
                    fill="none"
                    stroke="#111827"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.9, ease }}
                  />
                  {trendData.map((d, i) => (
                    <motion.circle
                      key={`${i}-${d.value}`}
                      cx={i * (560 / Math.max(trendData.length - 1, 1)) + 20}
                      cy={170 - (d.value / maxVal) * 130}
                      r="6"
                      fill="#ffffff"
                      stroke="#38c1ff"
                      strokeWidth="3"
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.35, ease, delay: i * 0.05 }}
                    />
                  ))}
                </>
              )}
            </svg>
            <div
              className="mt-4 grid text-center text-[12px] font-medium text-[#6b7280]"
              style={{ gridTemplateColumns: `repeat(${trendData.length}, 1fr)` }}
            >
              {trendData.map((d, i) => <span key={`${d.label}-${i}`}>{d.label}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentStatusPanel({
  title, subtitle, tone, students,
}: {
  title: string;
  subtitle: string;
  tone: "attention" | "top";
  students: { id: string; name: string; detail: string }[];
}) {
  const panelTone = tone === "attention" ? "border-[#fecaca] bg-[#fff7f7]" : "border-[#bbf7d0] bg-[#f5fff8]";
  const badgeTone = tone === "attention" ? "bg-[#fee2e2] text-[#dc2626]" : "bg-[#dcfce7] text-[#15803d]";

  return (
    <div className={`rounded-[24px] border ${panelTone} px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[24px] font-semibold tracking-[-0.03em] text-[#111827]">{title}</p>
          <p className="mt-1 text-[14px] text-[#6b7280]">{subtitle}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${badgeTone}`}>
          {students.length} students
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {students.length === 0 ? (
          <p className="text-[14px] text-[#9ca3af]">
            {tone === "attention" ? "All students are on track 🎉" : "No top performers yet — data will appear as students earn XP."}
          </p>
        ) : (
          students.map((student, index) => (
            <motion.article
              key={student.id}
              className="flex items-center justify-between gap-4 rounded-[18px] border border-white/70 bg-white/80 px-4 py-3"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, ease, delay: index * 0.06 }}
              whileHover={{ y: -4, boxShadow: "0 16px 30px rgba(15,23,42,0.08)" }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <motion.div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${
                    tone === "attention" ? "bg-[#111827] text-white" : "bg-[#dcfce7] text-[#15803d]"
                  }`}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3 + index * 0.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {student.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </motion.div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-[#111827]">{student.name}</p>
                  <p className="truncate text-[13px] text-[#6b7280]">{student.detail}</p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${badgeTone}`}>
                {tone === "attention" ? "Needs follow-up" : "On fire 🔥"}
              </span>
            </motion.article>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Active filters pill strip ────────────────────────────────────────────────

function ActiveFilterPills({
  courseLabel,
  cohortLabel,
  days,
  onClearCourse,
  onClearCohort,
}: {
  courseLabel?: string;
  cohortLabel?: string;
  days: number;
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
      className="flex flex-wrap gap-2"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {pills.map((pill) => (
        <span
          key={pill.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#bae6fd] bg-[#f0f9ff] px-3 py-1 text-[12px] font-semibold text-[#0369a1]"
        >
          {pill.label}
          <button
            type="button"
            onClick={pill.onClear}
            className="ml-0.5 rounded-full p-0.5 hover:bg-[#bae6fd] transition-colors"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
    </motion.div>
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
  const [days, setDays] = useState(7);

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

  // Reset cohort when course changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCohortId("all");
  }, [selectedCourseId]);

  // Fetch analytics whenever filters change
  const fetchAnalytics = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (selectedCourseId !== "all") params.set("courseId", selectedCourseId);
    if (selectedCohortId !== "all") params.set("cohortId", selectedCohortId);

    fetch(`/api/teacher/analytics?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAnalytics(json.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days, selectedCourseId, selectedCohortId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnalytics();
  }, [fetchAnalytics]);

  const m = analytics?.metrics;

  // Build dropdown options
  const courseOptions = [
    { id: "all", label: "All Courses" },
    ...courses.map((c) => ({ id: c.id, label: c.title })),
  ];

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const cohortOptions = [
    { id: "all", label: "All Batches" },
    ...(selectedCourse?.cohorts.map((c) => ({ id: c.id, label: c.name })) ?? []),
  ];

  const metricCards: MetricConfig[] = m
    ? [
        {
          title: "Active Students",
          value: m.activeStudents,
          delta: "+live",
          deltaTone: "text-[#16a34a]",
          accent: "from-[#3ec7ff] via-[#7dd7ff] to-[#d7f2ff]",
          note: "Total unique students with active enrollments",
        },
        {
          title: "Doubts Resolved",
          value: m.doubtsResolved,
          delta: `${m.openDoubts} open`,
          deltaTone: m.openDoubts > 0 ? "text-[#f59e0b]" : "text-[#16a34a]",
          accent: "from-[#6f63ff] via-[#b8b0ff] to-[#edeaff]",
          note: `${m.totalDoubts} total doubts submitted in the last ${days} days`,
        },
        {
          title: "Video Completion",
          value: `${m.videoCompletionRate}%`,
          delta: m.videoCompletionRate > 70 ? "Good" : "Low",
          deltaTone: m.videoCompletionRate > 70 ? "text-[#16a34a]" : "text-[#ef4444]",
          accent: "from-[#111827] via-[#4b5563] to-[#d1d5db]",
          progress: m.videoCompletionRate,
          note: "Lessons marked complete vs. total started",
        },
        {
          title: "Drop-off Rate",
          value: `${m.dropOffRate}%`,
          delta: m.dropOffRate < 20 ? "Healthy" : "High",
          deltaTone: m.dropOffRate < 20 ? "text-[#16a34a]" : "text-[#ef4444]",
          accent: "from-[#f59e0b] via-[#f7c86d] to-[#fff1cf]",
          note: "Students with no lesson activity in this period",
        },
      ]
    : [];

  return (
    <div className="space-y-8 w-full max-w-7xl">
      {/* Hero Header */}
      <RevealSection>
        <section className="rounded-[28px] border border-[#edf0f5] bg-[radial-gradient(circle_at_top_left,rgba(56,193,255,0.12),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8fbff_48%,#fff7d6_100%)] px-6 py-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#38c1ff]">{label}</p>
              <h1 className="mt-3 max-w-[720px] text-[clamp(2.3rem,5vw,4.8rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-[#111827]">
                {title}
              </h1>
              <p className="mt-4 max-w-[620px] text-[15px] leading-7 text-[#4b5563] sm:text-[16px]">
                {subtitle}
              </p>
            </div>
            <motion.div
              className="inline-flex items-center gap-2 self-start rounded-full border border-[#d7ecff] bg-white/90 px-4 py-2 text-[13px] font-medium text-[#111827] shadow-[0_10px_26px_rgba(15,23,42,0.05)]"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
              Live data
            </motion.div>
          </div>
        </section>
      </RevealSection>

      {/* Filter bar */}
      <RevealSection delay={0.04}>
        <section className="rounded-[24px] border border-[#edf0f5] bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:px-6 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
            {/* Time Period dropdown */}
            <FilterDropdown
              label="Time Period"
              value={String(days)}
              options={[
                { id: "7", label: "Last 7 days" },
                { id: "14", label: "Last 14 days" },
                { id: "30", label: "Last 30 days" },
                { id: "90", label: "Last 90 days" },
              ]}
              onChange={(id) => setDays(Number(id))}
            />

            {/* Course dropdown */}
            <FilterDropdown
              label="Course"
              value={selectedCourseId}
              options={courseOptions}
              onChange={setSelectedCourseId}
            />

            {/* Batch (Cohort) dropdown — disabled when no course selected */}
            <FilterDropdown
              label="Batch"
              value={selectedCohortId}
              options={cohortOptions}
              onChange={setSelectedCohortId}
              disabled={selectedCourseId === "all"}
            />

            {/* Quick day buttons */}
            <div className="flex items-end gap-3">
              {([7, 14, 30] as const).map((d) => (
                <motion.button
                  key={d}
                  type="button"
                  className={`flex h-12 flex-1 items-center justify-center rounded-[16px] text-[14px] font-semibold transition ${
                    days === d
                      ? "bg-[#38c1ff] text-white shadow-[0_14px_28px_rgba(56,193,255,0.28)]"
                      : "border border-[#38c1ff] text-[#209bd2] hover:bg-[#f0f9ff]"
                  }`}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setDays(d)}
                >
                  {d}d
                </motion.button>
              ))}
            </div>
          </div>

          {/* Active filter pills */}
          <ActiveFilterPills
            courseLabel={selectedCourse?.title}
            cohortLabel={selectedCourse?.cohorts.find((c) => c.id === selectedCohortId)?.name}
            days={days}
            onClearCourse={() => setSelectedCourseId("all")}
            onClearCohort={() => setSelectedCohortId("all")}
          />
        </section>
      </RevealSection>

      {/* Metric cards */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 py-10 justify-center text-[#8b8888]"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="h-6 w-6 rounded-full border-2 border-[#38c1ff] border-t-transparent"
            />
            Loading analytics...
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <RevealSection delay={0.08}>
              <StaggerGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {metricCards.map((metric) => (
                  <AnalyticsMetricCard key={metric.title} {...metric} />
                ))}
              </StaggerGrid>
            </RevealSection>

            <RevealSection delay={0.1}>
              <AnalyticsChart trendData={analytics?.trendData ?? []} days={days} />
            </RevealSection>

            <RevealSection delay={0.12}>
              <div className="grid gap-5 xl:grid-cols-2">
                <StudentStatusPanel
                  title="Need Attention"
                  subtitle="Students with low study activity"
                  tone="attention"
                  students={analytics?.needsAttention ?? []}
                />
                <StudentStatusPanel
                  title="Top Performers"
                  subtitle="Highest XP earners overall"
                  tone="top"
                  students={analytics?.topStudents ?? []}
                />
              </div>
            </RevealSection>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TeacherAnalytics() {
  return (
    <div className="min-h-screen bg-[#f7f6f6] text-black">
      <PageTransition>
        <TeacherTopBar />

        <div className="mx-auto grid max-w-[1920px] gap-6 px-3 pb-14 pt-4 sm:px-6 sm:pt-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:px-0 lg:pt-8">
          <TeacherSidebar />

          <main className="lg:pr-[160px]">
            <SharedAnalyticsDashboard />
          </main>
        </div>
      </PageTransition>
    </div>
  );
}
