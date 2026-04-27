"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ChartNoAxesColumn,
  CircleAlert,
  Clock3,
  Flame,
  PlayCircle,
  Sparkles,
  TrendingUp,
  House,
  CalendarDays,
  Video,
  MessageSquareText,
  CircleHelp,
  NotebookPen,
  Award,
  UserCircle,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { useAuth } from "@/context/auth-context";
import { cx } from "@/lib/cx";
import {
  AnimHeading,
  fadeUp,
  FloatPulse,
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "../_components/motion-wrappers";

const assets = {
  heroIllustration:
    "https://www.figma.com/api/mcp/asset/75c44446-493a-4847-aea9-82ffdd5154ae",
  goalsMascot:
    "https://www.figma.com/api/mcp/asset/52d69ee5-f3a1-45fc-9e50-0d2dd9a35209",
  studyWeekly:
    "https://www.figma.com/api/mcp/asset/fb5afafa-601e-463f-9876-2fecdb2a6f4b",
  streak:
    "https://www.figma.com/api/mcp/asset/bb63682e-9c1d-4902-a113-58530742394f",
  goalStudy:
    "https://www.figma.com/api/mcp/asset/d305095b-367f-4355-9389-d8f4b9a4fd46",
  goalAssignments:
    "https://www.figma.com/api/mcp/asset/f3c5b0a8-0354-4814-aeb1-46902c7b215c",
  goalLectures:
    "https://www.figma.com/api/mcp/asset/5b102e2e-e50e-4cca-af6d-6ef4b2cae47f",
  goalReview:
    "https://www.figma.com/api/mcp/asset/906de174-dd1c-464f-a568-fbcd9adcfbd0",
} as const;

const goalImages = [
  assets.goalStudy,
  assets.goalAssignments,
  assets.goalLectures,
  assets.goalReview,
] as const;

const sidebarItems = [
  { label: "Dashboard", href: "/dashboard", icon: House },
  { label: "Courses", href: "/dashboard/courses", icon: BookOpen },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "Live Classes", href: "/dashboard/live-classes", icon: Video },
  { label: "Community", href: "/dashboard/community", icon: MessageSquareText },
  { label: "Doubts", href: "/dashboard/doubts", icon: CircleHelp },
  { label: "Assignments", href: "/dashboard/assignments", icon: NotebookPen },
  { label: "Progress", href: "/dashboard/progress", icon: ChartNoAxesColumn, active: true },
  { label: "Certificates", href: "/dashboard/certificates", icon: Award },
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
] as const;

const WEEK_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const displayDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

const classTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

type TopicMastery = {
  label: string;
  tone: "strong" | "moderate" | "weak";
};

type ProgressData = {
  courseProgress: Array<{
    id: string;
    title: string;
    slug: string;
    thumbnail: string | null;
    percent: number;
    lessons: string;
    totalHours: number;
  }>;
  upcomingClasses: Array<{
    id: string;
    title: string;
    mentor: string;
    time: string;
    duration: number;
    meetingUrl: string | null;
  }>;
  missedClasses: Array<{
    id: string;
    title: string;
    mentor: string;
    time: string;
    recordingUrl: string | null;
  }>;
  weeklyGoals: Array<{
    title: string;
    percent: number;
    color: string;
  }>;
  chartData: Array<{
    day: string;
    value: number;
  }>;
  weeklyStudyHours: number;
  streakCount: number;
  topicMastery?: TopicMastery[];
};

const defaultMastery: TopicMastery[] = [
  { label: "Sketching", tone: "strong" },
  { label: "Creativity", tone: "weak" },
  { label: "Color Theory", tone: "strong" },
  { label: "Typography", tone: "moderate" },
  { label: "UI Design", tone: "strong" },
  { label: "3D Modeling", tone: "weak" },
];

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getDisplayName(name: string | null | undefined) {
  if (!name) return "Student";

  const firstName = name.trim().split(/\s+/)[0];
  return firstName || "Student";
}

function formatClassTime(value: string) {
  return classTimeFormatter.format(new Date(value));
}

function buildChartModel(chartData: ProgressData["chartData"]) {
  const data =
    chartData.length > 0
      ? chartData
      : WEEK_DAYS.map((day) => ({
          day,
          value: 0,
        }));

  const width = 640;
  const height = 240;
  const paddingX = 26;
  const paddingY = 18;
  const baselineY = height - paddingY;
  const usableHeight = height - paddingY * 2;
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const stepX = data.length > 1 ? (width - paddingX * 2) / (data.length - 1) : 0;

  const points = data.map((point, index) => {
    const x = paddingX + stepX * index;
    const ratio = point.value / maxValue;
    const y = baselineY - ratio * usableHeight;

    return {
      ...point,
      x,
      y,
    };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const bestPoint = data.reduce(
    (best, point) => (point.value > best.value ? point : best),
    data[0],
  );
  const ticks = Array.from({ length: 4 }, (_, index) => {
    const value = Math.round((maxValue / 3) * (3 - index));
    const y = paddingY + ((usableHeight / 3) * index);

    return {
      id: `tick-${index}`,
      value,
      y,
    };
  });

  return {
    areaPath,
    baselineY,
    bestPoint,
    linePath,
    points,
    ticks,
    total,
    width,
    height,
  };
}

function getToneMeta(tone: TopicMastery["tone"]) {
  if (tone === "strong") {
    return { label: "Strong", color: "#4caf50" };
  }

  if (tone === "moderate") {
    return { label: "Moderate", color: "#f5a623" };
  }

  return { label: "Weak", color: "#ff5a1f" };
}

function ActionLink({
  href,
  label,
  external = false,
  variant = "primary",
  className,
}: {
  href: string;
  label: string;
  external?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const classes = buttonStyles({
    className,
    size: "sm",
    variant,
  });

  const content = (
    <>
      <span>{label}</span>
      <ArrowRight className="h-4 w-4" />
    </>
  );

  if (external) {
    return (
      <a className={classes} href={href} rel="noreferrer" target="_blank">
        {content}
      </a>
    );
  }

  return (
    <Link className={classes} href={href}>
      {content}
    </Link>
  );
}

function HeroPill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/25 bg-white/12 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2 text-white/84">
        <Icon className="h-4 w-4" />
        <span className="text-[12px] font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>
      <p className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-white">
        {value}
      </p>
    </div>
  );
}

function HeroBanner({
  name,
  courseCount,
  upcomingCount,
  streakCount,
}: {
  name: string;
  courseCount: number;
  upcomingCount: number;
  streakCount: number;
}) {
  return (
    <RevealSection>
      <section className="relative overflow-hidden rounded-[32px] bg-[#38c1ff] px-6 py-7 shadow-[0_24px_60px_rgba(56,193,255,0.28)] sm:px-8 lg:px-10 lg:py-9">
        <div className="pointer-events-none absolute -left-20 top-[-5rem] h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute bottom-[-5rem] right-[-3rem] h-52 w-52 rounded-full bg-[#fec600]/30 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
          <div className="max-w-[38rem]">
            <p className="text-[15px] font-medium text-white/86">
              {displayDateFormatter.format(new Date())}
            </p>
            <h1 className="mt-4 text-[clamp(2rem,4vw,2.8rem)] font-semibold tracking-[-0.05em] text-white">
              Welcome back, {name}!
            </h1>
            <p className="mt-3 max-w-[34ch] text-[clamp(1rem,2vw,1.35rem)] font-medium leading-relaxed text-white/92">
              Always stay updated in your student portal.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroPill
                icon={BookOpen}
                label="Courses"
                value={`${courseCount} active`}
              />
              <HeroPill
                icon={CalendarClock}
                label="Classes"
                value={`${upcomingCount} upcoming`}
              />
              <HeroPill
                icon={Flame}
                label="Streak"
                value={`${streakCount} days`}
              />
            </div>
          </div>

          <FloatPulse className="pointer-events-none mx-auto hidden h-[250px] w-[280px] lg:block">
            <div className="relative h-full w-full">
              <Image
                alt=""
                className="object-contain"
                fill
                src={assets.heroIllustration}
                unoptimized
              />
            </div>
          </FloatPulse>
        </div>
      </section>
    </RevealSection>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const normalizedPercent = clampPercent(percent);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (normalizedPercent / 100) * circumference;

  return (
    <div className="relative h-[166px] w-[166px]">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          fill="none"
          r={radius}
          stroke="#d7d7d7"
          strokeWidth="12"
        />
        <motion.circle
          cx="70"
          cy="70"
          fill="none"
          initial={{ strokeDashoffset: circumference }}
          r={radius}
          stroke="#f5ba00"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
          strokeWidth="12"
          transition={{ duration: 1, ease: "easeOut" }}
          viewport={{ once: true }}
          whileInView={{ strokeDashoffset: strokeOffset }}
        />
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        <div className="grid h-[112px] w-[112px] place-items-center rounded-full bg-[#f5f5f5] shadow-[inset_0_6px_18px_rgba(17,24,39,0.06)]">
          <div className="text-center">
            <p className="text-[36px] font-semibold tracking-[-0.04em] text-black">
              {normalizedPercent}%
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#98a2b3]">
              Complete
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseProgressCard({
  course,
  index,
}: {
  course: ProgressData["courseProgress"][number];
  index: number;
}) {
  const courseHref = `/dashboard/courses/${course.slug}`;
  const percent = clampPercent(course.percent);

  return (
    <motion.article
      className="rounded-[26px] bg-[#ebebeb] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
      transition={{ delay: index * 0.08, duration: 0.3 }}
      variants={fadeUp}
      whileHover={{ y: -4 }}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_190px] xl:items-center">
        <div className="rounded-[22px] bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[20px] bg-[#dce5ec]">
            {course.thumbnail ? (
              <div
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url("${course.thumbnail}")` }}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,rgba(56,193,255,0.2),rgba(254,198,0,0.24))]">
                <BookOpen className="h-10 w-10 text-[var(--brand-primary-dark)]" />
              </div>
            )}

            <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#0f172a] shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
                {percent}% complete
              </span>
              <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#4a5565] shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
                {course.totalHours}h total
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="text-[22px] font-semibold tracking-[-0.03em] text-black">
              {course.title}
            </h3>
            <p className="text-[14px] leading-6 text-[#4a5565]">{course.lessons}</p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <ProgressRing percent={percent} />
          <ActionLink
            className="min-w-[176px]"
            href={courseHref}
            label="Continue learning"
          />
        </div>
      </div>
    </motion.article>
  );
}

function ClassCard({
  title,
  mentor,
  time,
  status,
  actionHref,
  actionLabel,
  actionExternal = false,
  durationMins,
  index,
}: {
  title: string;
  mentor: string;
  time: string;
  status: "UPCOMING" | "MISSED";
  actionHref: string;
  actionLabel: string;
  actionExternal?: boolean;
  durationMins?: number;
  index: number;
}) {
  const isMissed = status === "MISSED";
  const statusColor = isMissed ? "#fb2c36" : "#35bbff";

  return (
    <motion.article
      className={cx(
        "rounded-[18px] border px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.05)]",
        isMissed ? "border-[#ffd3d5] bg-[#fff5f5]" : "border-white/80 bg-white",
      )}
      transition={{ delay: index * 0.08, duration: 0.28 }}
      variants={fadeUp}
      whileHover={{ y: -4 }}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.14em]"
          style={{
            backgroundColor: `${statusColor}18`,
            color: statusColor,
          }}
        >
          {status}
        </span>

        <div
          className="grid h-10 w-10 place-items-center rounded-[14px]"
          style={{ backgroundColor: `${statusColor}14`, color: statusColor }}
        >
          <CalendarClock className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-black">
          {title}
        </h3>
        <p className="mt-1 text-[13px] text-[#667085]">{mentor}</p>
      </div>

      <div className="mt-4 space-y-2 text-[13px] text-[#475467]">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4" />
          <span>{formatClassTime(time)}</span>
        </div>
        {typeof durationMins === "number" ? (
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>{durationMins} min session</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4" />
            <span>Recording available to catch up</span>
          </div>
        )}
      </div>

      <div className="mt-5">
        <ActionLink
          className="w-full"
          external={actionExternal}
          href={actionHref}
          label={actionLabel}
          variant={isMissed ? "secondary" : "primary"}
        />
      </div>
    </motion.article>
  );
}

function HighlightMetricCard({
  image,
  label,
  value,
  caption,
  index,
}: {
  image: string;
  label: string;
  value: string;
  caption: string;
  index: number;
}) {
  return (
    <motion.article
      className="rounded-[24px] bg-[#71d3ff] px-5 py-5 text-white shadow-[0_16px_34px_rgba(56,193,255,0.22)]"
      initial={{ opacity: 0, scale: 0.94 }}
      transition={{ delay: index * 0.12, duration: 0.3 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      whileInView={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center justify-between gap-4">
        <FloatPulse className="relative h-[86px] w-[86px]">
          <Image
            alt=""
            className="object-contain"
            fill
            src={image}
            unoptimized
          />
        </FloatPulse>

        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
            {label}
          </p>
          <p className="mt-1 text-[34px] font-semibold tracking-[-0.05em] text-white">
            {value}
          </p>
        </div>
      </div>

      <p className="mt-4 text-[14px] leading-6 text-white/88">{caption}</p>
    </motion.article>
  );
}

function PerformanceStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] bg-white px-4 py-4 shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#98a2b3]">
        {label}
      </p>
      <p className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[#0f172a]">
        {value}
      </p>
    </div>
  );
}

function PerformanceChart({
  chartData,
}: {
  chartData: ProgressData["chartData"];
}) {
  const model = buildChartModel(chartData);

  return (
    <RevealSection delay={0.1}>
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <AnimHeading className="text-[32px] font-semibold tracking-[-0.05em] text-black">
            Performance
          </AnimHeading>
          <p className="text-[14px] text-[#667085]">
            Lesson completions in the last 7 days
          </p>
        </div>

        <Surface className="mt-4 px-5 py-5 sm:px-6 sm:py-6" tone="muted">
          <div className="grid gap-3 md:grid-cols-3">
            <PerformanceStat label="Weekly total" value={String(model.total)} />
            <PerformanceStat label="Best day" value={model.bestPoint.day} />
            <PerformanceStat
              label="Peak completions"
              value={String(model.bestPoint.value)}
            />
          </div>

          <div className="mt-6 rounded-[24px] bg-white px-4 py-5 shadow-[0_8px_20px_rgba(15,23,42,0.05)] sm:px-6">
            <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
                <div className="relative h-[240px] text-[11px] font-medium text-[#98a2b3]">
                  {model.ticks.map((tick) => (
                    <span
                      key={tick.id}
                      className="absolute left-0 -translate-y-1/2"
                      style={{ top: tick.y }}
                    >
                    {tick.value}
                  </span>
                ))}
              </div>

              <div>
                <div className="relative h-[240px]">
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {model.ticks.map((tick) => (
                      <div
                        key={`${tick.id}-line`}
                        className="border-t border-dashed border-[#dbe4ec]"
                      />
                    ))}
                  </div>

                  <svg
                    className="relative z-10 h-full w-full"
                    fill="none"
                    viewBox={`0 0 ${model.width} ${model.height}`}
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="progress-chart-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#38c1ff" stopOpacity="0.24" />
                        <stop offset="100%" stopColor="#38c1ff" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    <path d={model.areaPath} fill="url(#progress-chart-fill)" />
                    <motion.path
                      d={model.linePath}
                      initial={{ pathLength: 0, opacity: 0 }}
                      stroke="#34c8ff"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="4"
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                      viewport={{ once: true }}
                      whileInView={{ pathLength: 1, opacity: 1 }}
                    />

                    {model.points.map((point, index) => (
                      <g key={`${point.day}-${index}`}>
                        <circle cx={point.x} cy={point.y} fill="#ffffff" r="8" />
                        <circle cx={point.x} cy={point.y} fill="#34c8ff" r="4.5" />
                      </g>
                    ))}
                  </svg>
                </div>

                <div className="mt-3 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold tracking-[0.12em] text-[#98a2b3]">
                  {model.points.map((point) => (
                    <span key={point.day}>{point.day}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Surface>
      </section>
    </RevealSection>
  );
}

function GoalRow({
  title,
  percent,
  color,
  image,
  index,
}: {
  title: string;
  percent: number;
  color: string;
  image: string;
  index: number;
}) {
  const normalizedPercent = clampPercent(percent);

  return (
    <motion.article
      className="flex items-center gap-4 rounded-[16px] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
      initial={{ opacity: 0, x: -18 }}
      transition={{ delay: index * 0.08, duration: 0.28 }}
      viewport={{ once: true }}
      whileHover={{ x: 4 }}
      whileInView={{ opacity: 1, x: 0 }}
    >
      <div
        className="relative h-14 w-14 shrink-0 rounded-[14px]"
        style={{ backgroundColor: color }}
      >
        <Image alt="" className="object-contain p-3" fill src={image} unoptimized />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-[14px] font-semibold text-[#1f2937]">
            {title}
          </span>
          <span className="text-[14px] font-semibold text-[#667085]">
            {normalizedPercent}%
          </span>
        </div>

        <div className="mt-3 h-[8px] overflow-hidden rounded-full bg-[#edf0f2]">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            style={{ backgroundColor: color }}
            transition={{ delay: index * 0.08, duration: 0.7, ease: "easeOut" }}
            viewport={{ once: true }}
            whileInView={{ width: `${normalizedPercent}%` }}
          />
        </div>
      </div>
    </motion.article>
  );
}

function MasteryRow({
  label,
  tone,
  index,
}: TopicMastery & {
  index: number;
}) {
  const meta = getToneMeta(tone);

  return (
    <motion.article
      className="flex items-center justify-between gap-4 rounded-[16px] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
      initial={{ opacity: 0, x: 18 }}
      transition={{ delay: index * 0.08, duration: 0.28 }}
      viewport={{ once: true }}
      whileHover={{ x: -4 }}
      whileInView={{ opacity: 1, x: 0 }}
    >
      <span className="text-[15px] font-semibold text-[#111827]">{label}</span>
      <span
        className="inline-flex min-w-[96px] items-center justify-center rounded-[12px] px-3 py-2 text-[12px] font-semibold text-white"
        style={{ backgroundColor: meta.color }}
      >
        {meta.label}
      </span>
    </motion.article>
  );
}

export default function DashboardProgressPage() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProgress() {
      try {
        const response = await fetch("/api/users/me/progress");
        const payload = await response.json();

        if (!active) return;

        if (payload.success) {
          setProgressData(payload.data);
          setLoadError(false);
          return;
        }

        setLoadError(true);
      } catch (error) {
        console.error(error);
        if (active) {
          setLoadError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProgress();

    return () => {
      active = false;
    };
  }, []);

  const displayName = getDisplayName(user?.name);
  const courses = progressData?.courseProgress ?? [];
  const upcoming = progressData?.upcomingClasses ?? [];
  const missed = progressData?.missedClasses ?? [];
  const goals = progressData?.weeklyGoals ?? [];
  const chartData = progressData?.chartData ?? [];
  const studyHours = progressData?.weeklyStudyHours ?? 0;
  const streakCount = progressData?.streakCount ?? 0;
  const mastery =
    progressData?.topicMastery && progressData.topicMastery.length > 0
      ? progressData.topicMastery
      : defaultMastery;

  return (
    <PageTransition>
      <div className="mx-auto grid max-w-[1920px] gap-8 text-black lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
        <RevealSection className="lg:pr-7 py-6">
          <aside className="overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#ffbf00_0%,#ffd86a_100%)] px-4 py-4 shadow-[0_18px_48px_rgba(254,198,0,0.18)] lg:sticky lg:top-6 lg:min-h-[530px] lg:rounded-l-[0] lg:rounded-r-[40px] lg:px-7 lg:py-12">
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible">
              {sidebarItems.map((item) => {
                let href: string = item.href;
                if (item.label === "Profile" && user?.role === "MENTOR") {
                  href = "/dashboard/teacher/profile";
                }
                const Icon = item.icon;
                const active = pathname === href || (item.label === "Progress");
                return (
                  <Link
                    key={item.href}
                    className={cx(
                      "flex min-w-max items-center gap-4 rounded-[22px] px-4 py-3 text-[15px] font-medium text-black transition-colors duration-[var(--transition-fast)] lg:min-h-[56px] lg:px-5 lg:text-[18px]",
                      active ? "bg-white/40 shadow-sm" : "hover:bg-white/20",
                    )}
                    href={href}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </RevealSection>

        <main className="px-6 py-6 lg:px-10 lg:py-6">
          <div className="mx-auto max-w-[1280px] space-y-8">
            <HeroBanner
              courseCount={courses.length}
              name={displayName}
              streakCount={streakCount}
              upcomingCount={upcoming.length}
            />

            <RevealSection delay={0.05}>
              <section>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <AnimHeading className="text-[32px] font-semibold tracking-[-0.05em] text-black">
                    Course Progress
                  </AnimHeading>
                  <Link
                    className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--brand-primary-dark)]"
                    href="/dashboard/courses"
                  >
                    <span>View all courses</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {loading ? (
                  <div className="mt-4 flex items-center gap-3 text-[14px] text-[#667085]">
                    <motion.div
                      animate={{ rotate: 360 }}
                      className="h-5 w-5 rounded-full border-2 border-[#38c1ff] border-t-transparent"
                      transition={{ duration: 1, ease: "linear", repeat: Infinity }}
                    />
                    <span>Loading your progress snapshot...</span>
                  </div>
                ) : loadError ? (
                  <div className="mt-4">
                    <EmptyState
                      description="We couldn't load the latest student progress right now. Please refresh and try again."
                      icon={<CircleAlert className="h-6 w-6" />}
                      title="Progress is temporarily unavailable"
                    />
                  </div>
                ) : courses.length === 0 ? (
                  <div className="mt-4">
                    <EmptyState
                      action={
                        <ActionLink href="/dashboard/courses" label="Browse courses" />
                      }
                      description="Once you enroll in a course, your lesson completion and study progress will appear here."
                      icon={<BookOpen className="h-6 w-6" />}
                      title="No enrolled courses yet"
                    />
                  </div>
                ) : (
                  <StaggerGrid className="mt-4 grid gap-5 xl:grid-cols-2">
                    {courses.map((course, index) => (
                      <CourseProgressCard
                        key={course.id}
                        course={course}
                        index={index}
                      />
                    ))}
                  </StaggerGrid>
                )}
              </section>
            </RevealSection>

            <RevealSection delay={0.1}>
              <section>
                <Surface className="px-4 py-5 sm:px-6 sm:py-6" tone="muted">
                  <AnimHeading className="text-[28px] font-semibold tracking-[-0.04em] text-black">
                    My Classes
                  </AnimHeading>

                  <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center gap-2 text-[14px] font-semibold text-black">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#35bbff]" />
                          <span>Upcoming Classes</span>
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#35bbff] px-2 text-[11px] text-white">
                            {upcoming.length}
                          </span>
                        </div>

                        {upcoming.length === 0 ? (
                          <div className="mt-4">
                            <EmptyState
                              description="Your next live sessions will show up here as soon as they are scheduled."
                              icon={<CalendarClock className="h-6 w-6" />}
                              title="No upcoming classes"
                            />
                          </div>
                        ) : (
                          <StaggerGrid className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {upcoming.map((item, index) => (
                              <ClassCard
                                key={item.id}
                                actionExternal={Boolean(item.meetingUrl)}
                                actionHref={
                                  item.meetingUrl ?? `/dashboard/live-classes/${item.id}`
                                }
                                actionLabel="Join class"
                                durationMins={item.duration}
                                index={index}
                                mentor={item.mentor}
                                status="UPCOMING"
                                time={item.time}
                                title={item.title}
                              />
                            ))}
                          </StaggerGrid>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 text-[14px] font-semibold text-black">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#fb2c36]" />
                          <span>Missed Classes</span>
                          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#fb2c36] px-2 text-[11px] text-white">
                            {missed.length}
                          </span>
                        </div>

                        {missed.length === 0 ? (
                          <div className="mt-4">
                            <EmptyState
                              description="No missed classes so far. You're staying on top of the schedule."
                              icon={<TrendingUp className="h-6 w-6" />}
                              title="Attendance looks great"
                            />
                          </div>
                        ) : (
                          <StaggerGrid className="mt-4 grid gap-4 md:grid-cols-2">
                            {missed.map((item, index) => (
                              <ClassCard
                                key={item.id}
                                actionExternal={Boolean(item.recordingUrl)}
                                actionHref={
                                  item.recordingUrl ?? `/dashboard/live-classes/${item.id}`
                                }
                                actionLabel="View recording"
                                index={index}
                                mentor={item.mentor}
                                status="MISSED"
                                time={item.time}
                                title={item.title}
                              />
                            ))}
                          </StaggerGrid>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <HighlightMetricCard
                        caption="Weekly study hours from your live activity and learning sessions."
                        image={assets.studyWeekly}
                        index={0}
                        label="Study this week"
                        value={`${studyHours}h`}
                      />
                      <HighlightMetricCard
                        caption="Stay consistent to keep your daily learning streak climbing."
                        image={assets.streak}
                        index={1}
                        label="Current streak"
                        value={`${streakCount} days`}
                      />
                    </div>
                  </div>
                </Surface>
              </section>
            </RevealSection>

            <PerformanceChart chartData={chartData} />

            <RevealSection delay={0.12}>
              <section>
                <Surface className="px-5 py-5 sm:px-6 sm:py-6" tone="muted">
                  <div className="grid gap-8 xl:grid-cols-2">
                    <div>
                      <AnimHeading className="text-[28px] font-semibold tracking-[-0.04em] text-black">
                        Weekly Goals
                      </AnimHeading>

                      <div className="mt-6 space-y-4">
                        {goals.length === 0 ? (
                          <EmptyState
                            description="Goal progress will start filling in as you study, submit work, and attend lectures this week."
                            icon={<ChartNoAxesColumn className="h-6 w-6" />}
                            title="No goal activity yet"
                          />
                        ) : (
                          goals.map((goal, index) => (
                            <GoalRow
                              key={goal.title}
                              color={goal.color}
                              image={goalImages[index] ?? assets.goalStudy}
                              index={index}
                              percent={goal.percent}
                              title={goal.title}
                            />
                          ))
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <FloatPulse className="absolute right-0 top-0 hidden h-[78px] w-[56px] md:block">
                        <div className="relative h-full w-full">
                          <Image
                            alt=""
                            className="object-contain"
                            fill
                            src={assets.goalsMascot}
                            unoptimized
                          />
                        </div>
                      </FloatPulse>

                      <AnimHeading className="text-[28px] font-semibold tracking-[-0.04em] text-black">
                        Topic Mastery
                      </AnimHeading>

                      <div className="mt-6 space-y-3">
                        {mastery.map((topic, index) => (
                          <MasteryRow
                            key={`${topic.label}-${index}`}
                            index={index}
                            label={topic.label}
                            tone={topic.tone}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </Surface>
              </section>
            </RevealSection>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
