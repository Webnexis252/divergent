"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Sparkles,
  Video,
} from "lucide-react";
import type { UpcomingOverviewResponse } from "@/lib/upcoming-overview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { PageTransition, RevealSection } from "../_components/motion-wrappers";
import { DashboardSidebar } from "../_components/sidebar-nav";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const EVENT_META = {
  assignment: {
    Icon: FileText,
    accent: "var(--warning)",
    badgeTone: "warning" as const,
    background: "bg-[rgba(255,193,7,0.14)]",
    label: "Assignment",
  },
  class: {
    Icon: Video,
    accent: "var(--brand-primary-strong)",
    badgeTone: "brand" as const,
    background: "bg-(--brand-primary-soft)",
    label: "Live Class",
  },
  exam: {
    Icon: ClipboardCheck,
    accent: "var(--success)",
    badgeTone: "success" as const,
    background: "bg-[rgba(76,175,80,0.14)]",
    label: "Quiz",
  },
} as const;

type EventKind = keyof typeof EVENT_META;

type CalendarEvent = {
  id: string;
  kind: EventKind;
  date: Date;
  title: string;
  subtitle: string;
  description: string;
  details: { label: string; value: string }[];
  ctaHref: string;
  ctaLabel: string;
};

type CalendarCell = {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getCalendarCells(year: number, month: number): CalendarCell[] {
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

function formatShortDate(date: Date | string | null | undefined) {
  if (!date) return "TBD";

  const nextDate = typeof date === "string" ? new Date(date) : date;

  return nextDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(date: Date | string | null | undefined) {
  if (!date) return "TBD";

  const nextDate = typeof date === "string" ? new Date(date) : date;

  return nextDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildEvents(data: UpcomingOverviewResponse | null): CalendarEvent[] {
  if (!data) return [];

  const events: CalendarEvent[] = [];

  if (data.nextClass) {
    const item = data.nextClass;

    events.push({
      id: `class-${item.id}`,
      kind: "class",
      date: new Date(item.startTime),
      title: item.title,
      subtitle: item.courseTitle,
      description:
        "This is your next live session. Join on time to stay aligned with mentor guidance and keep the week moving.",
      details: [
        { label: "Time", value: formatTime(item.startTime) },
        { label: "Duration", value: `${item.duration} min` },
        { label: "Course", value: item.courseTitle },
      ],
      ctaHref: item.meetingUrl ?? `/dashboard/courses/${item.courseSlug}`,
      ctaLabel: item.meetingUrl ? "Join class" : "Open course",
    });
  }

  if (data.nextExam) {
    const item = data.nextExam;

    events.push({
      id: `exam-${item.quizId}`,
      kind: "exam",
      date: new Date(),
      title: item.title,
      subtitle: item.courseTitle,
      description:
        "Your next open quiz is ready. Use it as a checkpoint while the lesson context is still fresh.",
      details: [
        { label: "Lesson", value: item.lessonTitle },
        { label: "Status", value: item.availabilityLabel },
        { label: "Course", value: item.courseTitle },
      ],
      ctaHref: item.ctaHref,
      ctaLabel: "Start quiz",
    });
  }

  if (data.nextAssignment) {
    const item = data.nextAssignment;

    events.push({
      id: `assignment-${item.id}`,
      kind: "assignment",
      date: item.deadline ? new Date(item.deadline) : new Date(),
      title: item.title,
      subtitle: item.courseTitle,
      description:
        "Keep this assignment visible before it turns into last-minute work. Deadlines, points, and the course context are all surfaced here.",
      details: [
        { label: "Deadline", value: formatShortDate(item.deadline) },
        { label: "Points", value: String(item.points) },
        { label: "Course", value: item.courseTitle },
      ],
      ctaHref: "/dashboard/assignments",
      ctaLabel: "Open assignment",
    });
  }

  return events.sort((left, right) => left.date.getTime() - right.date.getTime());
}

function CalendarWidget({
  activeEventId,
  events,
  onNextMonth,
  onPrevMonth,
  onSelectEvent,
  onToday,
  viewDate,
}: {
  activeEventId: string | null;
  events: CalendarEvent[];
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
    const map = new Map<string, CalendarEvent[]>();

    for (const event of events) {
      const key = `${event.date.getFullYear()}-${event.date.getMonth()}-${event.date.getDate()}`;
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
            Calendar
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
          const isToday = isSameDay(today, cell.date);
          const isActive = cellEvents.some((event) => event.id === activeEventId);

          return (
            <button
              key={cell.date.toISOString()}
              className={`group min-h-[88px] border-b border-r border-(--line-soft) px-2 py-3 text-left transition-[background-color,border-color] duration-150 ease-out focus-visible:outline-none ${
                cellEvents.length > 0 ? "hover:bg-white" : ""
              } ${cell.isCurrentMonth ? "" : "bg-black/[0.02] text-(--text-subtle)"} ${
                isActive ? "bg-white" : ""
              }`}
              onClick={() => {
                if (cellEvents.length > 0) {
                  onSelectEvent(cellEvents[0].id);
                }
              }}
              type="button"
            >
              <div className="flex flex-col gap-3">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-[13px] font-semibold ${
                    isToday
                      ? "bg-(--brand-primary-strong) text-white shadow-(--shadow-accent)"
                      : "text-(--text-strong)"
                  }`}
                >
                  {cell.day}
                </span>

                {cellEvents.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {cellEvents.map((event) => (
                      <span
                        key={event.id}
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: EVENT_META[event.kind].accent }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
        {(Object.keys(EVENT_META) as EventKind[]).map((kind) => (
          <div key={kind} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: EVENT_META[kind].accent }}
            />
            <span className="text-[12px] font-medium text-(--text-muted)">
              {EVENT_META[kind].label}
            </span>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function EventPanel({ event }: { event: CalendarEvent | null }) {
  if (!event) {
    return (
      <EmptyState
        description="Pick a highlighted date to see the most relevant detail, context, and next action for that item."
        icon={<CalendarDays className="h-6 w-6" />}
        title="Nothing selected yet"
      />
    );
  }

  const meta = EVENT_META[event.kind];
  const Icon = meta.Icon;

  return (
    <Surface className="flex h-full flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
      <div className="rounded-(--radius-lg) bg-[linear-gradient(135deg,#062f4f_0%,#0c4f78_34%,#38c1ff_100%)] px-5 py-5 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-(--radius-md) bg-white/16">
            <Icon className="h-5 w-5" />
          </div>
          <Badge className="bg-white/14 text-white" tone="neutral">
            {meta.label}
          </Badge>
        </div>
        <h3 className="mt-4 text-[26px] font-semibold tracking-[-0.05em] text-white">
          {event.title}
        </h3>
        <p className="mt-2 text-[14px] leading-7 text-white/78">{event.subtitle}</p>
      </div>

      <p className="text-[14px] leading-7 text-(--text-muted)">
        {event.description}
      </p>

      <div className="grid gap-3">
        {event.details.map((detail) => (
          <div
            key={detail.label}
            className="flex items-center justify-between gap-4 rounded-(--radius-md) bg-white/72 px-4 py-3"
          >
            <span className="text-[13px] text-(--text-muted)">{detail.label}</span>
            <span className="text-[13px] font-semibold text-(--text-strong)">
              {detail.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-2">
        <Link
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-(--radius-pill) bg-(--brand-primary-strong) px-5 text-[15px] font-semibold text-white shadow-(--shadow-accent) transition-[transform,background-color] duration-150 ease-out hover:-translate-y-[1px] hover:bg-(--brand-primary) focus-visible:outline-none"
          href={event.ctaHref}
        >
          {event.ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Surface>
  );
}

function TimelineItem({ event }: { event: CalendarEvent }) {
  const meta = EVENT_META[event.kind];
  const Icon = meta.Icon;

  return (
    <motion.div
      className="rounded-(--radius-xl) border border-(--line-soft) bg-white/84 px-5 py-5 shadow-(--shadow-soft)"
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2 }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className={`grid h-12 w-12 place-items-center rounded-(--radius-md) ${meta.background}`}>
            <Icon className="h-5 w-5" style={{ color: meta.accent }} />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={meta.badgeTone}>{meta.label}</Badge>
              <span className="text-[12px] text-(--text-subtle)">
                {formatShortDate(event.date)}
              </span>
            </div>
            <h3 className="text-[20px] font-semibold tracking-[-0.04em] text-(--text-strong)">
              {event.title}
            </h3>
            <p className="text-[14px] text-(--text-muted)">{event.subtitle}</p>
          </div>
        </div>

        <Link
          className="inline-flex h-11 items-center gap-2 rounded-(--radius-pill) border border-(--line-soft) bg-white px-4 text-[14px] font-semibold text-(--text-strong) transition-[transform,border-color,box-shadow] duration-150 ease-out hover:-translate-y-[1px] hover:border-(--line-strong) hover:shadow-(--shadow-soft) focus-visible:outline-none"
          href={event.ctaHref}
        >
          {event.ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {event.details.map((detail) => (
          <span
            key={detail.label}
            className="rounded-full bg-white px-3 py-1.5 text-[12px] text-(--text-muted) shadow-(--shadow-soft)"
          >
            <span className="font-semibold text-(--text-strong)">{detail.label}:</span>{" "}
            {detail.value}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export default function UpcomingPage() {
  const [data, setData] = useState<UpcomingOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/users/me/upcoming-overview")
      .then((response) => response.json())
      .then((json) => {
        if (active && json.success) {
          setData(json.data);
        }
      })
      .catch(() => {
        // Silently handle — dev overlay picks up console.error
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const events = useMemo(() => buildEvents(data), [data]);
  const activeEventId = selectedEventId ?? events[0]?.id ?? null;
  const selectedEvent = events.find((event) => event.id === activeEventId) ?? null;

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
    <PageTransition>
      <div className="mx-auto grid max-w-[1920px] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
        <DashboardSidebar />

        <section className="px-6 py-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-[1260px] space-y-8">
            <RevealSection>
              <Surface className="relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-[32%] bg-[radial-gradient(circle_at_center,rgba(56,193,255,0.18),transparent_70%)]" />
                <div className="relative z-10 space-y-8">
                  <SectionHeading
                    eyebrow="Upcoming Work"
                    title="One calendar for classes, quizzes, and deadlines."
                    description="The schedule surface now behaves like a real planning tool: clear counts, a usable monthly view, and direct access to the next action that matters."
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard
                      accent="var(--brand-primary-strong)"
                      icon={<Video className="h-5 w-5" />}
                      label="Upcoming Classes"
                      meta="Live sessions that are still ahead on your calendar."
                      value={data?.counts.upcomingClasses ?? 0}
                    />
                    <MetricCard
                      accent="var(--success)"
                      icon={<ClipboardCheck className="h-5 w-5" />}
                      label="Open Quizzes"
                      meta="Assessments that are available and ready to start."
                      value={data?.counts.openExams ?? 0}
                    />
                    <MetricCard
                      accent="var(--warning)"
                      icon={<FileText className="h-5 w-5" />}
                      label="Pending Assignments"
                      meta="Work still waiting to be submitted inside your enrolled courses."
                      value={data?.counts.pendingAssignments ?? 0}
                    />
                  </div>
                </div>
              </Surface>
            </RevealSection>

            {loading ? (
              <RevealSection delay={0.06}>
                <Surface className="flex items-center justify-center gap-3 px-6 py-16 text-(--text-muted)">
                  <motion.div
                    animate={{ rotate: 360 }}
                    className="h-5 w-5 rounded-full border-2 border-(--brand-primary-strong) border-t-transparent"
                    transition={{ duration: 0.9, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
                  />
                  Loading your upcoming schedule...
                </Surface>
              </RevealSection>
            ) : events.length === 0 ? (
              <RevealSection delay={0.08}>
                <EmptyState
                  action={
                    <Link
                      className="inline-flex h-12 items-center gap-2 rounded-(--radius-pill) bg-(--brand-primary-strong) px-5 text-[15px] font-semibold text-white shadow-(--shadow-accent) transition-[transform,background-color] duration-150 ease-out hover:-translate-y-[1px] hover:bg-(--brand-primary) focus-visible:outline-none"
                      href="/dashboard/courses"
                    >
                      Browse courses
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  }
                  description="You are clear for now. As soon as a live class, quiz, or assignment becomes relevant, it will land here with one clean next step."
                  icon={<Sparkles className="h-6 w-6" />}
                  title="No upcoming items"
                />
              </RevealSection>
            ) : (
              <>
                <RevealSection delay={0.08}>
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <CalendarWidget
                      activeEventId={activeEventId}
                      events={events}
                      onNextMonth={goToNextMonth}
                      onPrevMonth={goToPreviousMonth}
                      onSelectEvent={setSelectedEventId}
                      onToday={goToToday}
                      viewDate={viewDate}
                    />
                    <EventPanel event={selectedEvent} />
                  </div>
                </RevealSection>

                <RevealSection delay={0.12}>
                  <div className="space-y-4">
                    <SectionHeading
                      eyebrow="Next In Line"
                      title="A tighter sequence of what to do next."
                      description="The same events appear below in timeline form so you can scan the week quickly without bouncing between modules."
                    />
                    <div className="space-y-3">
                      {events.map((event) => (
                        <TimelineItem event={event} key={event.id} />
                      ))}
                    </div>
                  </div>
                </RevealSection>
              </>
            )}
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
