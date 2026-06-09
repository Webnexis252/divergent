"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarClock,
  ChevronDown,
  Clock3,
  MessageSquareText,
  PlayCircle,
  Radio,
  Users,
  Video,
  FileText,
} from "lucide-react";
import { cx } from "@/lib/cx";
import { formatRelativeTime, formatShortDate } from "@/lib/date-format";
import type { LiveClassData, LiveClassItem } from "@/lib/live-class-types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { DashboardSidebar } from "@/app/dashboard/_components/sidebar-nav";
import { AnimCard, PageTransition, RevealSection, StaggerGrid } from "./motion-wrappers";

const statusMeta = {
  completed: { badgeTone: "success" as const, label: "Past Class" },
  live: { badgeTone: "danger" as const, label: "Live Now" },
  upcoming: { badgeTone: "brand" as const, label: "Upcoming" },
} as const;

export type LiveClassCardItem = LiveClassItem & { status: keyof typeof statusMeta };

function formatScheduleTime(startTime: string, duration: number) {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  return `${start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

function getScheduleHref(item: LiveClassItem) {
  return `/dashboard/live-classes/${item.id}`;
}

// ─── LiveClassCard ─────────────────────────────────────────────────────────────

function LiveClassCard({ item }: { item: LiveClassCardItem }) {
  const href = getScheduleHref(item);
  const isLive = item.status === "live";
  const isCompleted = item.status === "completed";
  const actionLabel = isLive ? "Join Now" : isCompleted ? "Watch Replay" : "View Class";

  return (
    <AnimCard>
      <article
        className={cx(
          "group relative overflow-hidden rounded-2xl bg-white transition-all duration-300",
          isLive
            ? "shadow-[0_8px_32px_rgba(239,68,68,0.14)] ring-1 ring-red-200"
            : "shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-black/5",
        )}
      >
        {/* Status accent bar */}
        <div
          className={cx(
            "h-[3px] w-full",
            isLive
              ? "bg-gradient-to-r from-red-500 to-orange-400"
              : isCompleted
                ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                : "bg-gradient-to-r from-[#38c1ff] to-[#0097e6]",
          )}
        />

        <div className="p-5 sm:p-6">
          {/* Top row */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {isLive ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-600 ring-1 ring-red-100">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                    Live Now
                  </span>
                ) : (
                  <Badge tone={statusMeta[item.status].badgeTone} className="text-[11px]">
                    {statusMeta[item.status].label}
                  </Badge>
                )}
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500">
                  {formatShortDate(item.startTime)}
                </span>
              </div>
              <h3 className="text-[1.05rem] font-bold leading-tight text-gray-900 sm:text-[1.15rem]">
                {item.title}
              </h3>
              <p className="text-[13px] text-gray-500">{item.courseTitle}</p>
            </div>
            <div
              className={cx(
                "grid h-12 w-12 shrink-0 place-items-center rounded-2xl",
                isLive ? "bg-red-50 text-red-500" : isCompleted ? "bg-emerald-50 text-emerald-600" : "bg-[#38c1ff]/10 text-[#38c1ff]",
              )}
            >
              {isCompleted ? <PlayCircle className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </div>
          </div>

          {/* Info chips */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-gray-50 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <Clock3 className="h-3 w-3 text-gray-400" />
                <span className="truncate">{formatScheduleTime(item.startTime, item.duration)}</span>
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <CalendarClock className="h-3 w-3 text-gray-400" />
                <span className="truncate">
                  {item.status === "live" ? "In progress" : formatRelativeTime(item.startTime)}
                </span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-4 border-t border-gray-100 pt-4">
            <Link
              href={href}
              className={cx(
                "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-semibold transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98]",
                isLive
                  ? "bg-red-500 text-white shadow-[0_4px_14px_rgba(239,68,68,0.35)] hover:bg-red-600 hover:shadow-[0_6px_20px_rgba(239,68,68,0.42)]"
                  : isCompleted
                    ? "bg-emerald-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.28)] hover:bg-emerald-600"
                    : "bg-[#38c1ff] text-white shadow-[0_4px_14px_rgba(56,193,255,0.35)] hover:bg-[#22b5f7]",
              )}
            >
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>
    </AnimCard>
  );
}

// ─── ScheduleSection ──────────────────────────────────────────────────────────

function ScheduleSection({
  accent,
  description,
  emptyDescription,
  items,
  title,
}: {
  accent: React.ReactNode;
  description: string;
  emptyDescription: string;
  items: LiveClassCardItem[];
  title: string;
}) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[1.55rem] font-bold tracking-tight text-gray-900 sm:text-[1.8rem]">
            {title}
          </h2>
          <p className="mt-1 text-[14px] text-gray-500">{description}</p>
        </div>
        <div className="shrink-0 self-start sm:self-auto">{accent}</div>
      </div>
      {items.length > 0 ? (
        <StaggerGrid className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <LiveClassCard item={item} key={item.id} />
          ))}
        </StaggerGrid>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-[14px] text-gray-400">
          {emptyDescription}
        </div>
      )}
    </div>
  );
}

// ─── NextRoomCard ─────────────────────────────────────────────────────────────

function NextRoomCard({ item }: { item: LiveClassCardItem | null }) {
  if (!item) {
    return (
      <AnimCard>
        <aside className="rounded-2xl bg-white p-6 ring-1 ring-black/5 shadow-[0_4px_20px_rgba(15,23,42,0.07)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Next Room</p>
          <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <Video className="h-6 w-6 text-gray-400" />
          </div>
          <p className="mt-4 text-[1.15rem] font-bold text-gray-900">Nothing scheduled yet</p>
          <p className="mt-2 text-[13px] leading-relaxed text-gray-500">
            When a new live session is published for your enrolled courses, it will appear here.
          </p>
          <Link
            href="/dashboard/courses"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#38c1ff] py-2.5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(56,193,255,0.3)] transition-all hover:-translate-y-0.5"
          >
            Browse Courses
            <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>
      </AnimCard>
    );
  }

  const isLive = item.status === "live";

  return (
    <AnimCard>
      <aside
        className={cx(
          "overflow-hidden rounded-2xl",
          isLive
            ? "bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-white shadow-[0_12px_40px_rgba(49,46,129,0.28)]"
            : "bg-white ring-1 ring-black/5 shadow-[0_4px_20px_rgba(15,23,42,0.07)]",
        )}
      >
        {isLive && (
          <div className="h-[2px] w-full bg-gradient-to-r from-red-500 via-orange-400 to-red-500" />
        )}
        <div className="p-6">
          <p className={cx("text-[11px] font-bold uppercase tracking-[0.2em]", isLive ? "text-white/50" : "text-gray-400")}>
            {item.status === "completed" ? "Latest Replay" : "Next Room"}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isLive ? (
              <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-red-300 ring-1 ring-red-500/30">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                </span>
                Live Now
              </span>
            ) : (
              <Badge tone={statusMeta[item.status].badgeTone}>{statusMeta[item.status].label}</Badge>
            )}
            <span
              className={cx(
                "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                isLive ? "bg-white/10 text-white/60" : "bg-gray-100 text-gray-500",
              )}
            >
              {formatShortDate(item.startTime)}
            </span>
          </div>

          <h3 className={cx("mt-3 text-[1.4rem] font-bold leading-tight", isLive ? "text-white" : "text-gray-900")}>
            {item.title}
          </h3>
          <p className={cx("mt-1 text-[13px]", isLive ? "text-white/55" : "text-gray-500")}>{item.courseTitle}</p>

          <div className={cx("mt-4 space-y-2 rounded-xl p-4", isLive ? "bg-white/8" : "bg-gray-50")}>
            <div className={cx("flex items-center gap-2 text-[13px]", isLive ? "text-white/75" : "text-gray-600")}>
              <Clock3 className="h-4 w-4 shrink-0" />
              <span>{formatScheduleTime(item.startTime, item.duration)}</span>
            </div>
            <div className={cx("flex items-center gap-2 text-[13px]", isLive ? "text-white/75" : "text-gray-600")}>
              <CalendarClock className="h-4 w-4 shrink-0" />
              <span>{isLive ? "Already started" : formatRelativeTime(item.startTime)}</span>
            </div>
          </div>

          <Link
            href={getScheduleHref(item)}
            className={cx(
              "mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold transition-all hover:-translate-y-0.5",
              isLive
                ? "bg-white text-[#312e81] shadow-[0_4px_14px_rgba(0,0,0,0.25)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)]"
                : "bg-[#38c1ff] text-white shadow-[0_4px_14px_rgba(56,193,255,0.3)]",
            )}
          >
            {isLive ? "Join Live Room" : item.status === "completed" ? "Watch Replay" : "Open Classroom"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </aside>
    </AnimCard>
  );
}

// ─── QuickRouteCard ───────────────────────────────────────────────────────────

function QuickRouteCard({ description, href, icon: Icon, title }: { description: string; href: string; icon: typeof Calendar; title: string }) {
  return (
    <AnimCard>
      <Link
        href={href}
        className="flex items-start gap-3 rounded-xl bg-white px-4 py-3.5 ring-1 ring-black/5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)] active:scale-[0.98]"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#38c1ff]/10 text-[#38c1ff]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-gray-900">{title}</p>
          <p className="text-[12px] leading-relaxed text-gray-500">{description}</p>
        </div>
      </Link>
    </AnimCard>
  );
}

// ─── Past Classes ─────────────────────────────────────────────────────────────

type CourseGroup = { courseTitle: string; courseSlug: string; classes: LiveClassCardItem[] };

function PastClassRow({ item }: { item: LiveClassCardItem }) {
  const replayHref = `/dashboard/live-classes/${item.id}/recording`;
  const date = new Date(item.startTime);
  const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex items-center justify-between gap-4 border-t border-gray-100 px-5 py-3.5 transition-colors hover:bg-gray-50/60">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#38c1ff]/10 text-[#38c1ff]">
          <PlayCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-gray-900">{item.title}</p>
          <p className="flex items-center gap-1.5 text-[12px] text-gray-400">
            <Clock3 className="h-3 w-3" /> {dateStr}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {item.resources?.map((res) => (
          <a key={res.id} href={res.fileUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50">
            <FileText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{res.title}</span>
          </a>
        ))}
        <Link
          href={replayHref}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#38c1ff] px-3 text-[12px] font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
        >
          Replay
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

function PastCourseAccordion({ group }: { group: CourseGroup }) {
  const [open, setOpen] = useState(false);
  const count = group.classes.length;
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-gray-900">{group.courseTitle}</p>
            <p className="text-[12px] text-gray-400">
              {count} recorded {count === 1 ? "session" : "sessions"}
            </p>
          </div>
        </div>
        <ChevronDown className={cx("h-5 w-5 text-gray-400 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div>
          {group.classes.map((cls) => (
            <PastClassRow key={cls.id} item={cls} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PastClassesSection({
  items,
  title = "Past Classes",
  description = "Browse replays by course — click any course to reveal its recorded sessions.",
}: {
  items: LiveClassCardItem[];
  title?: string;
  description?: string;
}) {
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
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[1.55rem] font-bold tracking-tight text-gray-900 sm:text-[1.8rem]">{title}</h2>
          <p className="mt-1 text-[14px] text-gray-500">{description}</p>
        </div>
        <span className="shrink-0 self-start rounded-full bg-gray-100 px-3 py-1 text-[12px] font-semibold text-gray-500 sm:self-auto">
          {items.length} saved
        </span>
      </div>
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-[14px] text-gray-400">
          No completed live classes are available yet.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, i) => (
            <PastCourseAccordion key={group.courseSlug || i} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function StudentLiveClassSchedule() {
  const { user } = useAuth();
  const [data, setData] = useState<LiveClassData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/live-classes")
      .then((r) => r.json())
      .then((json) => { if (active && json.success) setData(json.data); })
      .catch((e) => console.error("Failed to load class schedule", e))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const liveItems = useMemo<LiveClassCardItem[]>(() => data?.live.map((i) => ({ ...i, status: "live" })) ?? [], [data]);
  const upcomingItems = useMemo<LiveClassCardItem[]>(() => data?.upcoming.map((i) => ({ ...i, status: "upcoming" })) ?? [], [data]);
  const completedItems = useMemo<LiveClassCardItem[]>(() => data?.completed.map((i) => ({ ...i, status: "completed" })) ?? [], [data]);
  const nextRoom = useMemo(() => liveItems[0] ?? upcomingItems[0] ?? completedItems[0] ?? null, [liveItems, upcomingItems, completedItems]);
  const liveNowCount = data?.summary.live ?? 0;

  return (
    <PageTransition>
      <main className="min-h-screen bg-[#f5f6fa] pb-24 sm:pb-0">
        <div className="mx-auto max-w-[1920px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-0 xl:py-8">
          <div className="grid gap-4 sm:gap-6 xl:grid-cols-[222px_minmax(0,1fr)] xl:items-start">
            <DashboardSidebar />

            <section className="min-w-0 xl:pr-10">
              <div className="mx-auto max-w-[1160px] space-y-8">

                {/* ── Hero Banner ── */}
                <RevealSection>
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f4fc5] px-6 py-8 text-white shadow-[0_16px_48px_rgba(15,23,42,0.22)] sm:rounded-3xl sm:px-10 sm:py-10">
                    {/* Ambient glow */}
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,193,255,0.18),transparent_55%)]" />
                    <div className="pointer-events-none absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-[#38c1ff]/12 blur-3xl" />

                    <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
                          <Radio className="h-3.5 w-3.5" />
                          Live Classes
                        </div>
                        <h1 className="text-[1.85rem] font-extrabold leading-tight tracking-tight sm:text-[2.3rem]">
                          Your Live Classroom Hub
                        </h1>
                        <p className="mt-2.5 max-w-md text-[14px] leading-relaxed text-white/65 sm:text-[15px]">
                          Join live sessions, watch replays, and track your schedule — all from one workspace.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {liveNowCount > 0 && (
                          <div className="flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2.5 ring-1 ring-red-400/25">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
                            </span>
                            <span className="text-[14px] font-bold text-red-300">{liveNowCount} Live Now</span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center">
                            <div className="text-[1.3rem] font-bold">{loading ? "–" : String(data?.summary.upcoming ?? 0)}</div>
                            <div className="text-[10px] text-white/55 uppercase tracking-wider">Upcoming</div>
                          </div>
                          <div className="rounded-xl bg-white/10 px-4 py-2.5 text-center">
                            <div className="text-[1.3rem] font-bold">{loading ? "–" : String(data?.summary.completed ?? 0)}</div>
                            <div className="text-[10px] text-white/55 uppercase tracking-wider">Completed</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </RevealSection>

                {/* ── Content ── */}
                {loading ? (
                  <RevealSection delay={0.04}>
                    <div className="flex min-h-[12rem] items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm ring-1 ring-black/5">
                      <div className="flex items-center gap-3">
                        <Spinner className="h-5 w-5 border-[#38c1ff] text-[#38c1ff]" />
                        Loading your live-class schedule...
                      </div>
                    </div>
                  </RevealSection>
                ) : !data ? (
                  <RevealSection delay={0.06}>
                    <EmptyState
                      description="We could not load the live-class schedule right now. Refresh and try again."
                      icon={<CalendarClock className="h-6 w-6" />}
                      title="Schedule unavailable"
                    />
                  </RevealSection>
                ) : (
                  <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
                    {/* Left column – sections */}
                    <div className="space-y-10">
                      {liveItems.length > 0 && (
                        <RevealSection delay={0.06}>
                          <ScheduleSection
                            accent={
                              <span className="rounded-full bg-red-50 px-3 py-1 text-[12px] font-bold text-red-500 ring-1 ring-red-100">
                                {liveItems.length} active
                              </span>
                            }
                            description="These classrooms are live right now — join immediately."
                            emptyDescription="No sessions are currently live."
                            items={liveItems}
                            title="Ongoing Classes"
                          />
                        </RevealSection>
                      )}

                      <RevealSection delay={0.08}>
                        <ScheduleSection
                          accent={
                            <span className="rounded-full bg-[#38c1ff]/10 px-3 py-1 text-[12px] font-bold text-[#38c1ff]">
                              {upcomingItems.length} sessions
                            </span>
                          }
                          description="Your upcoming sessions — be ready when the room opens."
                          emptyDescription="No upcoming classes scheduled right now."
                          items={upcomingItems}
                          title="Upcoming Classes"
                        />
                      </RevealSection>

                      <RevealSection delay={0.1}>
                        <PastClassesSection items={completedItems} />
                      </RevealSection>
                    </div>

                    {/* Right column – sidebar */}
                    <div className="order-first space-y-4 xl:order-none xl:sticky xl:top-6">
                      <RevealSection delay={0.06}>
                        <NextRoomCard item={nextRoom} />
                      </RevealSection>

                      <RevealSection delay={0.1}>
                        <div className="space-y-3">
                          <p className="px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                            Quick Routes
                          </p>
                          <QuickRouteCard
                            description="See everything coming up on your schedule."
                            href="/dashboard/upcoming"
                            icon={Calendar}
                            title="Open Calendar"
                          />
                          <QuickRouteCard
                            description="Browse and continue your enrolled courses."
                            href="/dashboard/courses"
                            icon={BookOpen}
                            title="Browse Courses"
                          />
                          <QuickRouteCard
                            description="Join the student community discussion."
                            href="/dashboard/community"
                            icon={MessageSquareText}
                            title="Open Community"
                          />
                        </div>
                      </RevealSection>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
