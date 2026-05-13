"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  FileText,
  Layers3,
  RefreshCw,
  Sparkles,
  Video,
} from "lucide-react";
import { RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import type {
  CalendarEventType,
  CalendarFeed,
  CalendarFeedEvent,
} from "@/lib/calendar-feed";
import { cx } from "@/lib/cx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const EVENT_META = {
  assignment: {
    Icon: FileText,
    accent: "#f59e0b",
    badgeTone: "warning" as const,
    label: "Assignment",
    softClass: "bg-[rgba(245,158,11,0.12)]",
  },
  liveClass: {
    Icon: Video,
    accent: "#38c1ff",
    badgeTone: "brand" as const,
    label: "Live Class",
    softClass: "bg-[rgba(56,193,255,0.14)]",
  },
  exam: {
    Icon: ClipboardCheck,
    accent: "#16a34a",
    badgeTone: "success" as const,
    label: "Exam",
    softClass: "bg-[rgba(22,163,74,0.12)]",
  },
} as const;

const VARIANT_META = {
  admin: {
    accent: "#0ea5e9",
    chipClass: "bg-white/10 text-white",
    gradient:
      "bg-[linear-gradient(135deg,#062f4f_0%,#0c4f78_40%,#38c1ff_100%)]",
    panelClass: "border-white/14 bg-white/10 text-white",
  },
  student: {
    accent: "#f59e0b",
    chipClass: "bg-white/14 text-white",
    gradient:
      "bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_42%,#38c1ff_100%)]",
    panelClass: "border-white/14 bg-white/10 text-white",
  },
  teacher: {
    accent: "#059669",
    chipClass: "bg-white/12 text-white",
    gradient:
      "bg-[linear-gradient(135deg,#047857_0%,#059669_40%,#38c1ff_100%)]",
    panelClass: "border-white/14 bg-white/10 text-white",
  },
} as const;

type CalendarFilter = "all" | CalendarEventType;

export type CalendarWorkspaceProps = {
  description: string;
  endpoint: string;
  eyebrow: string;
  title: string;
  variant: keyof typeof VARIANT_META;
};

type CalendarCell = {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
};

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getCalendarCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells: CalendarCell[] = [];
  const daysInMonth = lastDay.getDate();

  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const previousMonthLastDay = new Date(year, month, 0).getDate();

  for (let index = startDay - 1; index >= 0; index -= 1) {
    const day = previousMonthLastDay - index;
    cells.push({
      date: new Date(year, month - 1, day),
      day,
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: new Date(year, month, day),
      day,
      isCurrentMonth: true,
    });
  }

  const remainder = cells.length % 7;
  if (remainder > 0) {
    const extra = 7 - remainder;
    for (let day = 1; day <= extra; day += 1) {
      cells.push({
        date: new Date(year, month + 1, day),
        day,
        isCurrentMonth: false,
      });
    }
  }

  return cells;
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatLongDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
}

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatWindowDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

function getRelativeLabel(date: string) {
  const eventDate = new Date(date);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfEventDay = new Date(
    eventDate.getFullYear(),
    eventDate.getMonth(),
    eventDate.getDate(),
  );
  const diffMs = startOfEventDay.getTime() - startOfToday.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;
  return formatShortDate(date);
}

function isExternalUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

function buildEventDetails(event: CalendarFeedEvent) {
  const details = [
    { label: "Course", value: event.course },
    { label: "Date", value: formatLongDate(event.date) },
    { label: "Time", value: formatTime(event.date) },
    { label: "Status", value: getRelativeLabel(event.date) },
  ];

  if (event.type === "assignment" && typeof event.points === "number") {
    details.push({ label: "Points", value: `${event.points}` });
  }

  if (event.type === "liveClass" && typeof event.duration === "number") {
    details.push({ label: "Duration", value: `${event.duration} min` });
  }

  if (event.type === "exam") {
    if (event.examType) {
      details.push({ label: "Exam Type", value: event.examType });
    }
    if (typeof event.durationMins === "number") {
      details.push({ label: "Duration", value: `${event.durationMins} min` });
    }
    if (event.endDate) {
      details.push({ label: "Closes", value: formatLongDate(event.endDate) });
    }
  }

  return details;
}

function CalendarGrid({
  activeEventId,
  events,
  onNextMonth,
  onPrevMonth,
  onSelectEvent,
  onToday,
  viewDate,
}: {
  activeEventId: string | null;
  events: CalendarFeedEvent[];
  onNextMonth: () => void;
  onPrevMonth: () => void;
  onSelectEvent: (id: string) => void;
  onToday: () => void;
  viewDate: Date;
}) {
  const today = useMemo(() => new Date(), []);
  const cells = useMemo(
    () => getCalendarCells(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );
  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarFeedEvent[]>();

    for (const event of events) {
      const date = new Date(event.date);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const entries = map.get(key) ?? [];
      entries.push(event);
      map.set(key, entries);
    }

    return map;
  }, [events]);

  return (
    <Surface className="overflow-hidden px-0 py-0">
      <div className="flex flex-col gap-4 border-b border-(--line-soft) px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-(--text-subtle)">
            Calendar Grid
          </p>
          <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-(--text-strong)">
            {formatMonthYear(viewDate)}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onToday} size="sm" variant="soft">
            Today
          </Button>
          <Button onClick={onPrevMonth} size="sm" variant="secondary">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button onClick={onNextMonth} size="sm" variant="secondary">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-(--line-soft) bg-white/54">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-(--text-subtle)"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const key = `${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`;
          const cellEvents = eventMap.get(key) ?? [];
          const selected = cellEvents.some((event) => event.id === activeEventId);
          const todayCell = isSameDay(today, cell.date);

          return (
            <button
              key={cell.date.toISOString()}
              className={cx(
                "group min-h-[108px] border-b border-r border-(--line-soft) px-2 py-3 text-left transition-[background-color,border-color] duration-150 ease-out focus-visible:outline-none",
                selected ? "bg-white" : "bg-transparent",
                cell.isCurrentMonth ? "text-(--text-strong)" : "bg-black/[0.02] text-(--text-subtle)",
                cellEvents.length > 0 && "hover:bg-white",
              )}
              onClick={() => {
                if (cellEvents[0]) onSelectEvent(cellEvents[0].id);
              }}
              type="button"
            >
              <div className="flex h-full flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cx(
                      "grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold",
                      todayCell
                        ? "bg-(--brand-primary-strong) text-white shadow-(--shadow-accent)"
                        : "text-inherit",
                    )}
                  >
                    {cell.day}
                  </span>

                  {cellEvents.length > 1 ? (
                    <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-semibold text-(--text-subtle)">
                      {cellEvents.length}
                    </span>
                  ) : null}
                </div>

                {cellEvents.length > 0 ? (
                  <div className="space-y-1.5">
                    {cellEvents.slice(0, 2).map((event) => {
                      const meta = EVENT_META[event.type];
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-2 rounded-full bg-white/88 px-2 py-1 shadow-(--shadow-soft)"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: meta.accent }}
                          />
                          <span className="truncate text-[10px] font-semibold text-(--text-strong)">
                            {event.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span className="block h-6" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Surface>
  );
}

function EventSpotlight({ event }: { event: CalendarFeedEvent | null }) {
  if (!event) {
    return (
      <EmptyState
        description="Pick a highlighted date to bring the exact class, assignment, or exam details into focus."
        icon={<CalendarDays className="h-6 w-6" />}
        title="No event selected"
      />
    );
  }

  const meta = EVENT_META[event.type];
  const details = buildEventDetails(event);
  const external = isExternalUrl(event.actionUrl);
  const Icon = meta.Icon;

  return (
    <Surface className="flex h-full flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
      <div className="rounded-[28px] bg-[linear-gradient(135deg,#062f4f_0%,#0c4f78_38%,#38c1ff_100%)] px-5 py-5 text-white shadow-[0_24px_50px_rgba(12,79,120,0.18)]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="grid h-11 w-11 place-items-center rounded-[16px] bg-white/14">
            <Icon className="h-5 w-5" />
          </div>
          <Badge className="bg-white/14 text-white" tone="neutral">
            {meta.label}
          </Badge>
          <Badge className="bg-white/10 text-white/80" tone="neutral">
            {getRelativeLabel(event.date)}
          </Badge>
        </div>
        <h3 className="mt-4 text-[28px] font-semibold tracking-[-0.05em] text-white">
          {event.title}
        </h3>
        <p className="mt-2 text-[14px] leading-7 text-white/80">{event.course}</p>
      </div>

      <div className="grid gap-3">
        {details.map((detail) => (
          <div
            key={`${event.id}-${detail.label}`}
            className="flex items-center justify-between gap-4 rounded-[18px] border border-(--line-soft) bg-white/76 px-4 py-3"
          >
            <span className="text-[13px] text-(--text-muted)">{detail.label}</span>
            <span className="text-right text-[13px] font-semibold text-(--text-strong)">
              {detail.value}
            </span>
          </div>
        ))}
      </div>

      <Link
        className="mt-auto inline-flex h-12 w-full items-center justify-center gap-2 rounded-(--radius-pill) bg-(--brand-primary-strong) px-5 text-[15px] font-semibold text-white shadow-(--shadow-accent) transition-[transform,background-color] duration-150 ease-out hover:-translate-y-[1px] hover:bg-(--brand-primary) focus-visible:outline-none"
        href={event.actionUrl}
        rel={external ? "noreferrer" : undefined}
        target={external ? "_blank" : undefined}
      >
        {event.actionLabel}
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </Surface>
  );
}

function AgendaCard({ event, index }: { event: CalendarFeedEvent; index: number }) {
  const meta = EVENT_META[event.type];
  const external = isExternalUrl(event.actionUrl);
  const Icon = meta.Icon;

  return (
    <motion.article
      className="rounded-[26px] border border-(--line-soft) bg-white/88 px-5 py-5 shadow-(--shadow-soft)"
      initial={{ opacity: 0, y: 14 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      viewport={{ margin: "-30px", once: true }}
      whileHover={{ y: -2 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className={cx("grid h-12 w-12 place-items-center rounded-[18px]", meta.softClass)}>
            <Icon className="h-5 w-5" style={{ color: meta.accent }} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={meta.badgeTone}>{meta.label}</Badge>
              <span className="text-[12px] text-(--text-subtle)">{event.course}</span>
            </div>
            <h3 className="mt-3 text-[20px] font-semibold tracking-[-0.04em] text-(--text-strong)">
              {event.title}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1.5 text-[12px] text-(--text-muted) shadow-(--shadow-soft)">
                {formatLongDate(event.date)}
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-[12px] text-(--text-muted) shadow-(--shadow-soft)">
                {formatTime(event.date)}
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-[12px] text-(--text-muted) shadow-(--shadow-soft)">
                {getRelativeLabel(event.date)}
              </span>
            </div>
          </div>
        </div>

        <Link
          className="inline-flex h-11 items-center gap-2 rounded-(--radius-pill) border border-(--line-soft) bg-white px-4 text-[14px] font-semibold text-(--text-strong) transition-[transform,border-color,box-shadow] duration-150 ease-out hover:-translate-y-[1px] hover:border-(--line-strong) hover:shadow-(--shadow-soft) focus-visible:outline-none"
          href={event.actionUrl}
          rel={external ? "noreferrer" : undefined}
          target={external ? "_blank" : undefined}
        >
          {event.actionLabel}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.article>
  );
}

export function CalendarWorkspace(props: CalendarWorkspaceProps) {
  const variant = VARIANT_META[props.variant];
  const [data, setData] = useState<CalendarFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    let active = true;

    fetch(props.endpoint)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error ?? "Unable to load calendar");
        }

        if (active) {
          setData(payload.data);
          setError(null);
        }
      })
      .catch((fetchError: unknown) => {
        if (active) {
          setError(
            fetchError instanceof Error ? fetchError.message : "Unable to load calendar",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [props.endpoint]);

  const events = data?.events ?? [];
  const counts = data?.counts ?? {
    assignment: 0,
    exam: 0,
    liveClass: 0,
    thisWeek: 0,
    today: 0,
    total: 0,
  };
  const filteredEvents =
    filter === "all" ? events : events.filter((event) => event.type === filter);
  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0] ?? null;
  const monthEventCount = filteredEvents.filter((event) => {
    const date = new Date(event.date);
    return (
      date.getMonth() === viewDate.getMonth() &&
      date.getFullYear() === viewDate.getFullYear()
    );
  }).length;

  const filterCounts = {
    all: counts.total,
    assignment: counts.assignment,
    exam: counts.exam,
    liveClass: counts.liveClass,
  };

  function goToPreviousMonth() {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  function goToToday() {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-8">
      <RevealSection>
        <section
          className={cx(
            "relative overflow-hidden rounded-[36px] border border-white/70 px-7 py-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] sm:px-8 sm:py-9",
            variant.gradient,
          )}
        >
          <div className="pointer-events-none absolute inset-y-0 right-0 w-[38%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_62%)]" />
          <div className="pointer-events-none absolute -right-12 top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.9fr)] lg:items-end">
            <div>
              <div className={cx("inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em]", variant.chipClass)}>
                {props.eyebrow}
              </div>
              <h1 className="mt-5 text-[clamp(2.2rem,4.4vw,3.7rem)] font-semibold tracking-[-0.06em]">
                {props.title}
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/80">
                {props.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/14 px-3 py-1.5 text-[12px] font-semibold">
                  {counts.assignment} assignments
                </span>
                <span className="rounded-full bg-white/14 px-3 py-1.5 text-[12px] font-semibold">
                  {counts.liveClass} live classes
                </span>
                <span className="rounded-full bg-white/14 px-3 py-1.5 text-[12px] font-semibold">
                  {counts.exam} exams
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className={cx("rounded-[24px] border px-5 py-5 backdrop-blur", variant.panelClass)}>
                <div className="flex items-center justify-between gap-3">
                  <CalendarDays className="h-5 w-5 text-white/82" />
                  <span className="text-[11px] uppercase tracking-[0.18em] text-white/62">
                    Upcoming Window
                  </span>
                </div>
                <p className="mt-4 text-[28px] font-semibold tracking-[-0.05em]">
                  {counts.total}
                </p>
                <p className="mt-2 text-[13px] leading-6 text-white/72">
                  {data
                    ? `${formatWindowDate(data.windowStart)} to ${formatWindowDate(data.windowEnd)}`
                    : "Loading current planning window"}
                </p>
              </div>

              <div className={cx("rounded-[24px] border px-5 py-5 backdrop-blur", variant.panelClass)}>
                <div className="flex items-center justify-between gap-3">
                  <Sparkles className="h-5 w-5 text-white/82" />
                  <span className="text-[11px] uppercase tracking-[0.18em] text-white/62">
                    Courses in Play
                  </span>
                </div>
                <p className="mt-4 text-[28px] font-semibold tracking-[-0.05em]">
                  {data?.courses.length ?? 0}
                </p>
                <p className="mt-2 text-[13px] leading-6 text-white/72">
                  Calendar entries are already scoped to the courses this role can act on.
                </p>
              </div>
            </div>
          </div>
        </section>
      </RevealSection>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          accent={variant.accent}
          icon={<Layers3 className="h-5 w-5" />}
          label="Visible Events"
          meta="Everything currently mapped into this schedule window."
          value={loading ? "..." : counts.total}
        />
        <MetricCard
          accent={variant.accent}
          icon={<Clock3 className="h-5 w-5" />}
          label="Happening Today"
          meta="Items landing today, including deadlines and sessions."
          value={loading ? "..." : counts.today}
        />
        <MetricCard
          accent={variant.accent}
          icon={<CalendarDays className="h-5 w-5" />}
          label="Due This Week"
          meta="The next seven days surfaced into one planning line."
          value={loading ? "..." : counts.thisWeek}
        />
        <MetricCard
          accent={variant.accent}
          icon={<BookOpenText className="h-5 w-5" />}
          label="Courses Represented"
          meta="Distinct course streams with active calendar movement."
          value={loading ? "..." : data?.courses.length ?? 0}
        />
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="surface-panel h-24 animate-pulse rounded-(--radius-xl)" />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
            <div className="surface-panel h-[580px] animate-pulse rounded-(--radius-xl)" />
            <div className="surface-panel h-[580px] animate-pulse rounded-(--radius-xl)" />
          </div>
          <div className="surface-panel h-72 animate-pulse rounded-(--radius-xl)" />
        </div>
      ) : error ? (
        <EmptyState
          action={
            <button
              className="inline-flex items-center gap-2 rounded-full border border-(--line-soft) bg-white px-4 py-2 text-[14px] font-semibold text-(--text-strong) transition hover:border-(--line-strong) hover:shadow-(--shadow-soft)"
              onClick={() => window.location.reload()}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          }
          description="The calendar feed could not be loaded right now. Refresh and try again once the network or API is back."
          icon={<CalendarDays className="h-6 w-6" />}
          title={error}
        />
      ) : events.length === 0 ? (
        <EmptyState
          description="No classes, assignments, or exams are scheduled in the active planning window yet. Once content is created for the courses in scope, it will land here automatically."
          icon={<CalendarDays className="h-6 w-6" />}
          title="Nothing on the calendar yet"
        />
      ) : (
        <>
          <Surface className="px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <SectionHeading
                description="Filter the feed, jump through the month, and keep the selected event detail synced with the grid below."
                eyebrow="Planning View"
                title={`${formatMonthYear(viewDate)} schedule`}
              />

              <div className="flex flex-wrap gap-2">
                {(["all", "assignment", "liveClass", "exam"] as const).map((option) => (
                  <button
                    key={option}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-150 ease-out",
                      filter === option
                        ? "bg-(--brand-primary-strong) text-white shadow-(--shadow-accent)"
                        : "bg-white text-(--text-muted) shadow-(--shadow-soft) hover:text-(--text-strong)",
                    )}
                    onClick={() => setFilter(option)}
                    type="button"
                  >
                    {option === "all" ? "All events" : EVENT_META[option].label}
                    <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] font-bold text-inherit">
                      {filterCounts[option]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px] text-(--text-muted)">
              <span className="rounded-full bg-(--brand-primary-soft) px-3 py-1.5 font-semibold text-(--brand-primary-dark)">
                {monthEventCount} event{monthEventCount === 1 ? "" : "s"} in {formatMonthYear(viewDate)}
              </span>
              {data ? (
                <span>
                  Window: {formatWindowDate(data.windowStart)} to {formatWindowDate(data.windowEnd)}
                </span>
              ) : null}
            </div>
          </Surface>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
            <CalendarGrid
              activeEventId={selectedEvent?.id ?? null}
              events={filteredEvents}
              onNextMonth={goToNextMonth}
              onPrevMonth={goToPreviousMonth}
              onSelectEvent={setSelectedEventId}
              onToday={goToToday}
              viewDate={viewDate}
            />
            <EventSpotlight event={selectedEvent} />
          </div>

          <div className="space-y-4">
            <SectionHeading
              description="A tighter agenda list for the same calendar feed, useful when you want the next actions without scanning the whole month grid."
              eyebrow="Agenda"
              title={
                filter === "all"
                  ? "Upcoming agenda"
                  : `${EVENT_META[filter].label} agenda`
              }
            />

            {filteredEvents.length === 0 ? (
              <EmptyState
                description="The current filter has no items in the active planning window. Switch the event type or return to All events."
                icon={<CalendarDays className="h-6 w-6" />}
                title="No matching events"
              />
            ) : (
              <div className="space-y-4">
                {filteredEvents.map((event, index) => (
                  <AgendaCard event={event} index={index} key={event.id} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
