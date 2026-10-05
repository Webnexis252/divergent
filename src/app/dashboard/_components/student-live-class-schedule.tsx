"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CalendarPlus, ChevronDown, Clock3, FileText, PlayCircle } from "lucide-react";
import { cx } from "@/lib/cx";
import type { LiveClassData, LiveClassItem } from "@/lib/live-class-types";
import { EmptyState } from "@/components/ui/empty-state";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { PageHero } from "@/components/ui/page-hero";
import { AnimCard, PageTransition, RevealSection, StaggerGrid } from "./motion-wrappers";

export type LiveClassCardItem = LiveClassItem & { status: "live" | "upcoming" | "completed" };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const art = {
  live: "/assets/dashboard/stat-live.png",
  upcoming: "/assets/dashboard/stat-upcoming.png",
  past: "/assets/dashboard/stat-past.png",
} as const;

// Brand blue darkened just enough to pass AA as small text on white.
// globals.css sets `a { color: inherit }` outside any layer, so text colours that land on links are marked `!`
const brandInk = "text-[color-mix(in_srgb,var(--brand-primary-strong)_72%,black)]!";
const liveInk = "text-[color-mix(in_srgb,var(--status-error)_78%,black)]";

const primaryAction =
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-(--brand-primary-strong) px-5 text-[14px] font-semibold text-white! shadow-[0_4px_12px_rgba(32,155,210,0.28)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-95 active:translate-y-0";
// globals.css sets `button { font: inherit }` outside any layer, so on <button>s the type utilities go on an inner span
const secondaryBase = cx(
  "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] border border-[rgba(56,193,255,0.45)] bg-white text-[14px] font-semibold transition-colors duration-150 hover:bg-(--brand-primary-soft)",
  brandInk,
);
const secondaryAction = cx(secondaryBase, "px-4");
const card = "overflow-hidden rounded-[20px] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]";
const sectionTitle = "text-[clamp(1.5rem,2.6vw,1.85rem)] font-semibold tracking-[-0.02em] text-black";
const sectionLede = "mt-1 text-[14px] text-black/55";
const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold";
const rowGrid =
  "grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-3 px-5 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-5 sm:px-6";
// Phones: the row action sits under the title instead of squeezing it
const rowAction = "col-start-2 mt-3 justify-self-start sm:col-start-auto sm:mt-0";

const clockFormatter = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
const weekdayFormatter = new Intl.DateTimeFormat("en-IN", { weekday: "long" });
const dayMonthFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const dayMonthYearFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
const longDateFormatter = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });

function classHref(item: LiveClassItem) {
  return `/dashboard/live-classes/${item.id}`;
}

// Mirrors getLiveClassStatus on the server so classes move between buckets without a refetch
function statusAt(item: LiveClassItem, now: number): LiveClassCardItem["status"] {
  if (item.isEnded) return "completed";
  const start = Date.parse(item.startTime);
  if (now < start) return "upcoming";
  return now <= start + item.duration * MINUTE ? "live" : "completed";
}

function clockParts(value: string | number) {
  const parts = clockFormatter.formatToParts(new Date(value));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { time: `${pick("hour")}:${pick("minute")}`, period: pick("dayPeriod").toLowerCase() };
}

function startOfDay(ms: number) {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function dayHeading(dayStart: number, now: number) {
  const offset = Math.round((dayStart - startOfDay(now)) / (24 * HOUR));
  const date = new Date(dayStart);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return {
    label: offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : weekdayFormatter.format(date),
    date: (sameYear ? dayMonthFormatter : dayMonthYearFormatter).format(date),
  };
}

function formatCountdown(ms: number) {
  if (ms <= 5 * MINUTE) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }
  const hours = Math.floor(ms / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function timeZoneLabel() {
  return new Intl.DateTimeFormat("en-IN", { timeZoneName: "short" })
    .formatToParts(new Date())
    .find((part) => part.type === "timeZoneName")?.value;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "es"}`;
}

function toIcsDate(ms: number) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function downloadCalendarEvent(item: LiveClassItem) {
  const start = Date.parse(item.startTime);
  const url = new URL(classHref(item), window.location.origin).toString();
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Live classes//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:live-class-${item.id}@${window.location.hostname}`,
    `DTSTAMP:${toIcsDate(Date.now())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(start + item.duration * MINUTE)}`,
    `SUMMARY:${escapeIcs(item.title)}`,
    `DESCRIPTION:${escapeIcs(`${item.courseTitle}\n${url}`)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = href;
  link.download = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "live-class"}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

// ─── Small pieces ─────────────────────────────────────────────────────────────

function LivePill({ className }: { className?: string }) {
  return (
    <span className={cx(pill, "bg-[rgba(255,61,0,0.1)]", liveInk, className)}>
      <span aria-hidden="true" className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--status-error) opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-(--status-error)" />
      </span>
      Live now
    </span>
  );
}

function CountdownPill({ ms }: { ms: number }) {
  return (
    <span className={cx(pill, "bg-[rgba(254,198,0,0.2)] tabular-nums text-[#6b4c00]")}>
      <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
      Starts in {formatCountdown(ms)}
    </span>
  );
}

function CoursePill({ title }: { title: string }) {
  return <span className={cx(pill, "max-w-full truncate bg-(--brand-primary-soft)", brandInk)}>{title}</span>;
}

function CalendarButton({ item, iconOnly }: { item: LiveClassItem; iconOnly?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => downloadCalendarEvent(item)}
      className={iconOnly ? cx(secondaryBase, "w-10") : secondaryAction}
      aria-label={iconOnly ? "Add to calendar" : undefined}
      title={iconOnly ? "Add to calendar" : undefined}
    >
      <CalendarPlus aria-hidden="true" className="h-4 w-4 shrink-0" />
      {!iconOnly && <span className="text-[14px] font-semibold">Add to calendar</span>}
    </button>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function heroSummary(live: LiveClassCardItem[], upcoming: LiveClassCardItem[], now: number) {
  if (live.length > 0) {
    return live.length === 1
      ? "A class is live right now. Jump in and catch up with your batch."
      : `${live.length} classes are live right now.`;
  }
  const todayEnd = startOfDay(now) + 24 * HOUR;
  const today = upcoming.filter((item) => Date.parse(item.startTime) < todayEnd).length;
  const week = upcoming.filter((item) => Date.parse(item.startTime) < now + 7 * 24 * HOUR).length;
  if (today > 0) {
    return week > today
      ? `You have ${plural(today, "class")} today and ${week - today} more this week.`
      : `You have ${plural(today, "class")} today.`;
  }
  if (week > 0) return `You have ${plural(week, "class")} coming up this week.`;
  if (upcoming.length > 0) return `Your next class is on ${longDateFormatter.format(Date.parse(upcoming[0].startTime))}.`;
  return "No classes scheduled yet. New sessions show up here as soon as they're published.";
}

function SpotlightCard({ item, now }: { item: LiveClassCardItem | null; now: number }) {
  if (!item) {
    return (
      <div className="flex items-center gap-4 rounded-[20px] bg-white p-5 text-black shadow-[0_12px_30px_rgba(8,80,130,0.18)] sm:p-6">
        <Image alt="" className="h-20 w-20 shrink-0 scale-[1.4] object-contain" height={160} src={art.upcoming} width={160} />
        <div className="min-w-0">
          <p className="text-[16px] font-bold">Nothing on the calendar</p>
          <p className="mt-1 text-[13px] leading-relaxed text-black/55">Browse your courses while you wait for the next session.</p>
          <Link href="/dashboard/courses" className={cx(primaryAction, "mt-4 h-9 px-4 text-[13px]")}>
            Browse courses
          </Link>
        </div>
      </div>
    );
  }

  const start = Date.parse(item.startTime);
  const isLive = item.status === "live";
  const startsIn = start - now;
  const clock = clockParts(start);
  const end = clockParts(start + item.duration * MINUTE);
  const day = dayHeading(startOfDay(start), now);
  const minutesIn = Math.max(0, Math.floor((now - start) / MINUTE));

  return (
    <div className="rounded-[20px] bg-white p-5 text-black shadow-[0_12px_30px_rgba(8,80,130,0.18)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        {isLive ? (
          <LivePill />
        ) : (
          <span className={cx(pill, "bg-(--brand-primary-soft)", brandInk)}>Up next</span>
        )}
        <span className="text-[12px] font-medium tabular-nums text-black/50">
          {isLive
            ? item.attendeeCount > 0
              ? `${item.attendeeCount} joined`
              : `Started ${minutesIn === 0 ? "just now" : `${minutesIn} min ago`}`
            : `${day.label}, ${day.date}`}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2 tabular-nums">
        <span className="text-[2.25rem] font-bold leading-none tracking-[-0.04em]">{clock.time}</span>
        <span className="text-[13px] font-semibold text-black/45">{clock.period}</span>
        <span className="ml-1 text-[13px] font-medium text-black/45">
          to {end.time} {end.period}
        </span>
      </div>

      <h2 className="mt-3 line-clamp-2 text-[17px] font-bold leading-snug">{item.title}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <CoursePill title={item.courseTitle} />
        {!isLive && startsIn < 24 * HOUR && <CountdownPill ms={startsIn} />}
      </div>

      <div className="mt-5 flex gap-2">
        <Link href={classHref(item)} className={cx(primaryAction, "flex-1")}>
          {isLive || startsIn <= 5 * MINUTE ? "Join class" : "View class"}
        </Link>
        {!isLive && <CalendarButton item={item} iconOnly />}
      </div>
    </div>
  );
}

function SpotlightSkeleton() {
  return (
    <div className="rounded-[20px] bg-white/95 p-6 shadow-[0_12px_30px_rgba(8,80,130,0.18)]">
      <div className="h-6 w-20 animate-pulse rounded-full bg-black/[0.06]" />
      <div className="mt-5 h-9 w-32 animate-pulse rounded-lg bg-black/[0.07]" />
      <div className="mt-4 h-4 w-4/5 animate-pulse rounded bg-black/[0.06]" />
      <div className="mt-6 h-10 w-full animate-pulse rounded-[12px] bg-black/[0.05]" />
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function StatCard({ image, label, live, value }: { image: string; label: string; live?: boolean; value: string }) {
  return (
    <AnimCard className="min-w-[210px] flex-1 snap-start sm:min-w-0">
      <div className="flex items-center gap-4 rounded-[24px] bg-white p-3 pr-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
        <div className="grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-[18px] bg-[#f4f2ff]">
          <Image alt="" className="h-[76px] w-[76px] scale-[1.45] object-contain" height={152} src={image} width={152} />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-black/55">
            {live && (
              <span aria-hidden="true" className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--status-error) opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-(--status-error)" />
              </span>
            )}
            {label}
          </p>
          <p className="mt-1 text-[2rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-black">{value}</p>
        </div>
      </div>
    </AnimCard>
  );
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

function groupByDay(items: LiveClassCardItem[]) {
  const days = new Map<number, LiveClassCardItem[]>();
  for (const item of items) {
    const key = startOfDay(Date.parse(item.startTime));
    days.set(key, [...(days.get(key) ?? []), item]);
  }
  return Array.from(days, ([dayStart, dayItems]) => ({ dayStart, items: dayItems }));
}

function ScheduleRow({ item, now }: { item: LiveClassCardItem; now: number }) {
  const isLive = item.status === "live";
  const startsIn = Date.parse(item.startTime) - now;
  const clock = clockParts(item.startTime);
  const fileCount = item.resources?.length ?? 0;

  return (
    <li className={cx("group relative py-4 transition-colors duration-150 hover:bg-[#f8fcff]", rowGrid)}>
      <div>
        <time
          dateTime={item.startTime}
          className="block text-[1.5rem] font-bold leading-none tracking-[-0.04em] tabular-nums text-black sm:text-[1.75rem]"
        >
          {clock.time}
          <span className="ml-1 text-[12px] font-semibold tracking-normal text-black/45">{clock.period}</span>
        </time>
        <p className="mt-2 text-[12px] font-medium tabular-nums text-black/50">{item.duration} min</p>
      </div>

      <div className="min-w-0">
        <Link
          href={classHref(item)}
          className="line-clamp-2 text-[15px] font-semibold leading-snug text-black! transition-colors after:absolute after:inset-0 group-hover:text-(--brand-primary-strong)! sm:text-[16px]"
        >
          {item.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <CoursePill title={item.courseTitle} />
          {isLive ? <LivePill /> : startsIn < 24 * HOUR && <CountdownPill ms={startsIn} />}
          {fileCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-black/50">
              <FileText aria-hidden="true" className="h-3.5 w-3.5" />
              {fileCount} {fileCount === 1 ? "file" : "files"}
            </span>
          )}
        </div>
      </div>

      <div className={cx("relative z-10", rowAction)}>
        {isLive || startsIn <= 5 * MINUTE ? (
          <Link href={classHref(item)} className={primaryAction}>
            Join class
          </Link>
        ) : (
          <CalendarButton item={item} />
        )}
      </div>
    </li>
  );
}

function ScheduleSkeleton() {
  return (
    <div role="status" className={card}>
      <span className="sr-only">Loading your schedule</span>
      <div className="h-10 bg-[rgba(56,193,255,0.06)]" />
      {[0, 1, 2].map((row) => (
        <div key={row} className={cx(rowGrid, "border-t border-black/[0.05] py-5")}>
          <div className="space-y-2">
            <div className="h-6 w-16 animate-pulse rounded-md bg-black/[0.06]" />
            <div className="h-3 w-10 animate-pulse rounded bg-black/[0.04]" />
          </div>
          <div className="space-y-2.5">
            <div className="h-4 w-3/5 animate-pulse rounded bg-black/[0.06]" />
            <div className="h-6 w-32 animate-pulse rounded-full bg-black/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptySchedule({ hasLiveClass }: { hasLiveClass: boolean }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Image alt="" className="h-28 w-28 scale-[1.4] object-contain" height={224} src={art.upcoming} width={224} />
      <p className="mt-4 text-[18px] font-bold text-black">
        {hasLiveClass ? "Nothing else scheduled" : "No upcoming classes"}
      </p>
      <p className="mt-1.5 max-w-[42ch] text-[14px] leading-relaxed text-black/55">
        New sessions for your enrolled courses appear here as soon as they&apos;re published.
      </p>
      <Link href="/dashboard/courses" className={cx(secondaryAction, "mt-5")}>
        Browse courses
      </Link>
    </div>
  );
}

// ─── Replays ──────────────────────────────────────────────────────────────────

type CourseGroup = { courseTitle: string; courseSlug: string; classes: LiveClassCardItem[] };

function groupByMonth<T>(items: T[], dateExtractor: (item: T) => Date) {
  const groups: Record<string, T[]> = {};
  items.forEach(item => {
    const d = new Date(dateExtractor(item));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map(key => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return { key, label, items: groups[key] };
    });
}

function ReplayRow({ item }: { item: LiveClassCardItem }) {
  const replayHref = `/dashboard/live-classes/${item.id}/recording`;

  return (
    <li className={cx("py-4", rowGrid)}>
      <div>
        <time
          dateTime={item.startTime}
          className="block text-[16px] font-bold leading-none tracking-[-0.02em] tabular-nums text-black/80"
        >
          {dayMonthFormatter.format(new Date(item.startTime))}
        </time>
        <p className="mt-2 text-[12px] font-medium tabular-nums text-black/50">{item.duration} min</p>
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-black">{item.title}</p>
        {item.resources && item.resources.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {item.resources.map((res) => (
              <li key={res.id}>
                <a
                  href={res.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-1 text-[12px] font-medium text-black/65! transition-colors hover:bg-(--brand-primary-soft) hover:text-black!"
                >
                  <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                  {res.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link href={replayHref} className={cx(secondaryAction, rowAction)}>
        <PlayCircle aria-hidden="true" className="h-4 w-4" />
        Watch
      </Link>
    </li>
  );
}

function ReplayMonth({
  defaultOpen,
  group,
}: {
  defaultOpen: boolean;
  group: { key: string; label: string; items: LiveClassCardItem[] };
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-black/[0.05]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-[#fafafa] px-5 py-2.5 text-left text-black/70 transition-colors hover:text-black sm:px-6"
        aria-expanded={open}
      >
        <span className="text-[13px] font-semibold">
          {group.label}
          <span className="font-medium tabular-nums text-black/45"> · {group.items.length}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cx("h-4 w-4 text-black/40 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <ol className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
          {group.items.map((cls) => (
            <ReplayRow key={cls.id} item={cls} />
          ))}
        </ol>
      )}
    </div>
  );
}

function ReplayCourse({ group }: { group: CourseGroup }) {
  const [open, setOpen] = useState(false);
  const count = group.classes.length;
  const latest = Math.max(...group.classes.map((item) => Date.parse(item.startTime)));

  const monthGroups = useMemo(() => {
    return groupByMonth(group.classes, (item) => new Date(item.startTime));
  }, [group.classes]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[#f8fcff] sm:px-6"
        aria-expanded={open}
      >
        <InitialsAvatar name={group.courseTitle} className="h-11 w-11 text-[14px]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold text-black">{group.courseTitle}</span>
          <span className="mt-0.5 block text-[13px] tabular-nums text-black/50">
            {count} {count === 1 ? "recording" : "recordings"} · latest {dayMonthYearFormatter.format(latest)}
          </span>
        </span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/[0.04]">
          <ChevronDown
            aria-hidden="true"
            className={cx("h-4 w-4 text-black/50 transition-transform duration-200", open && "rotate-180")}
          />
        </span>
      </button>
      {open && (
        <div>
          {monthGroups.map((monthGroup, index) => (
            <ReplayMonth key={monthGroup.key} group={monthGroup} defaultOpen={index === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PastClassesSection({
  items,
  title = "Class Replays",
  description = "Catch up on recorded sessions, grouped by course.",
}: {
  items: LiveClassCardItem[];
  title?: string;
  description?: string;
}) {
  const headingId = useId();
  const groups = useMemo<CourseGroup[]>(() => {
    const map = new Map<string, CourseGroup>();
    for (const item of items) {
      const key = item.courseSlug || item.courseTitle || "unknown";
      if (!map.has(key)) map.set(key, { courseTitle: item.courseTitle || "Unknown Course", courseSlug: key, classes: [] });
      map.get(key)!.classes.push(item);
    }
    return Array.from(map.values());
  }, [items]);

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 id={headingId} className={sectionTitle}>
            {title}
          </h2>
          <p className={sectionLede}>{description}</p>
        </div>
        <span className={cx(pill, "bg-black/[0.05] tabular-nums text-black/60")}>
          {items.length} {items.length === 1 ? "recording" : "recordings"}
        </span>
      </div>
      {groups.length === 0 ? (
        <div className={cx(card, "flex items-center gap-4 px-5 py-6 sm:px-6")}>
          <Image alt="" className="h-16 w-16 shrink-0 scale-[1.3] object-contain" height={128} src={art.past} width={128} />
          <p className="text-[14px] text-black/55">No completed classes yet. Replays appear here after each session.</p>
        </div>
      ) : (
        <div className={cx(card, "divide-y divide-black/[0.05]")}>
          {groups.map((group, i) => (
            <ReplayCourse key={group.courseSlug || i} group={group} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const noopSubscribe = () => () => {};

/**
 * `initialData` comes from the server page, so the schedule arrives with the
 * HTML instead of after a second request from the browser. Everything shown
 * from it depends on the viewer's clock and time zone (countdowns, "Today",
 * times in IST), which the server can't know, so it renders right after
 * hydration rather than in the server HTML.
 */
export function StudentLiveClassSchedule({ initialData = null }: { initialData?: LiveClassData | null }) {
  const [data, setData] = useState<LiveClassData | null>(initialData);
  const [fetching, setFetching] = useState(!initialData);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const loading = fetching || !hydrated;
  const skipInitialFetch = useRef(Boolean(initialData));

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    let active = true;
    fetch("/api/live-classes")
      .then((r) => r.json())
      .then((json) => { if (active && json.success) setData(json.data); })
      .catch((e) => console.error("Failed to load class schedule", e))
      .finally(() => { if (active) setFetching(false); });
    return () => { active = false; };
  }, [attempt]);

  const retry = useCallback(() => {
    setFetching(true);
    setAttempt((n) => n + 1);
  }, []);

  const allItems = useMemo(
    () => (data ? [...data.live, ...data.upcoming, ...data.completed] : []),
    [data],
  );

  // Tick every second only while a countdown is in its final minutes
  const needsSeconds = allItems.some((item) => {
    const startsIn = Date.parse(item.startTime) - now;
    return !item.isEnded && startsIn > 0 && startsIn <= 6 * MINUTE;
  });

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), needsSeconds ? 1000 : 30_000);
    return () => window.clearInterval(id);
  }, [needsSeconds]);

  // Re-bucket only when a class changes status, not on every tick
  const statusList = allItems.map((item) => statusAt(item, now)).join(",");
  const { live, upcoming, completed } = useMemo(() => {
    const statuses = statusList.split(",") as LiveClassCardItem["status"][];
    const withStatus = allItems.map((item, i) => ({ ...item, status: statuses[i] }));
    const byStart = (a: LiveClassItem, b: LiveClassItem) => Date.parse(a.startTime) - Date.parse(b.startTime);
    return {
      live: withStatus.filter((item) => item.status === "live").sort(byStart),
      upcoming: withStatus.filter((item) => item.status === "upcoming").sort(byStart),
      completed: withStatus.filter((item) => item.status === "completed").sort((a, b) => byStart(b, a)),
    };
  }, [allItems, statusList]);

  // The hero spotlights the first live class (or the next one); any other live classes lead the schedule
  const spotlight = live[0] ?? upcoming[0] ?? null;
  const scheduled = useMemo(() => [...live.slice(1), ...upcoming], [live, upcoming]);
  const days = useMemo(() => groupByDay(scheduled), [scheduled]);

  return (
    <PageTransition>
      {/* overflow-x-clip, not hidden: hidden makes <main> a scroll container and breaks the sticky rail */}
      <main className="min-h-screen overflow-x-clip bg-[#f9fafb] pb-24 sm:bg-[#f7f5f4] sm:pb-0">
        <div className="mx-auto max-w-[1920px]">
          <section className="min-w-0 space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-6 lg:px-[38px] lg:py-[18px] xl:pr-10">
            <RevealSection>
              <PageHero
                eyebrow={<p suppressHydrationWarning>{longDateFormatter.format(now)}</p>}
                title="Live Classes"
                description={
                  <p>
                    {loading
                      ? "Getting your schedule ready."
                      : data
                        ? heroSummary(live, upcoming, now)
                        : "Join live sessions, catch up on replays, and keep track of what's next."}
                  </p>
                }
                aside={loading ? <SpotlightSkeleton /> : data && <SpotlightCard item={spotlight} now={now} />}
              />
            </RevealSection>

            {!loading && !data ? (
              <RevealSection delay={0.04}>
                <EmptyState
                  title="Couldn't load your schedule"
                  description="Check your connection and try again."
                  action={
                    <button type="button" onClick={retry} className={primaryAction}>
                      <span className="text-[14px] font-semibold">Try again</span>
                    </button>
                  }
                />
              </RevealSection>
            ) : (
              <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_293px] xl:items-start">
                <div className="min-w-0 space-y-8 sm:space-y-10">
                  <RevealSection delay={0.06}>
                    <section aria-labelledby="schedule-heading" className="space-y-4">
                      <div>
                        <h2 id="schedule-heading" className={sectionTitle}>
                          Upcoming Classes
                        </h2>
                        <p className={sectionLede}>
                          Your sessions for the days ahead{!loading && data ? `, times in ${timeZoneLabel() ?? "your time zone"}` : ""}.
                        </p>
                      </div>
                      {loading ? (
                        <ScheduleSkeleton />
                      ) : (
                        <div className={card}>
                          {days.length === 0 ? (
                            <EmptySchedule hasLiveClass={live.length > 0} />
                          ) : (
                            days.map(({ dayStart, items }, index) => {
                              const heading = dayHeading(dayStart, now);
                              return (
                                <div key={dayStart} className={cx(index > 0 && "border-t border-black/[0.05]")}>
                                  <h3 className="flex items-center justify-between gap-3 bg-[rgba(56,193,255,0.07)] px-5 py-2.5 sm:px-6">
                                    <span className="text-[13px]">
                                      <span className="font-bold text-black">{heading.label}</span>
                                      <span className="ml-2 font-medium text-black/50">{heading.date}</span>
                                    </span>
                                    <span className="text-[12px] font-medium text-black/45">{plural(items.length, "class")}</span>
                                  </h3>
                                  <ol className="divide-y divide-black/[0.05]">
                                    {items.map((item) => (
                                      <ScheduleRow key={item.id} item={item} now={now} />
                                    ))}
                                  </ol>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </section>
                  </RevealSection>

                  {!loading && (
                    <RevealSection delay={0.08}>
                      <PastClassesSection items={completed} />
                    </RevealSection>
                  )}
                </div>

                <aside
                  aria-labelledby="summary-heading"
                  className="order-first min-w-0 space-y-4 xl:sticky xl:top-[calc(var(--app-header-height)+1.5rem)] xl:order-none"
                >
                  <div className="sr-only xl:not-sr-only">
                    <h2 id="summary-heading" className={sectionTitle}>
                      At a Glance
                    </h2>
                    <p className={sectionLede}>Your classes in numbers.</p>
                  </div>
                  <StaggerGrid className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-1">
                    <StatCard image={art.live} label="Live now" live={live.length > 0} value={loading ? "–" : String(live.length)} />
                    <StatCard image={art.upcoming} label="Upcoming" value={loading ? "–" : String(upcoming.length)} />
                    <StatCard image={art.past} label="Replays" value={loading ? "–" : String(completed.length)} />
                  </StaggerGrid>
                </aside>
              </div>
            )}
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
