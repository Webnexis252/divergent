"use client";

import Image from "next/image";
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
  House,
  CircleHelp,
  NotebookPen,
  ChartNoAxesColumn,
  Award,
  CalendarDays,
  UserCircle,
} from "lucide-react";
import { brand } from "@/lib/brand";
import { cx } from "@/lib/cx";
import { formatRelativeTime, formatShortDate } from "@/lib/date-format";
import type { LiveClassData, LiveClassItem } from "@/lib/live-class-types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import {
  AnimCard,
  FloatPulse,
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "./motion-wrappers";

const assets = {
  headerAvatar: "https://api.dicebear.com/9.x/shapes/svg?seed=021745ae-afe4-4dce-ad5c-2dd5ad2195e1",
  heroIllustration: "/assets/dashboard/live-classes-hero.png",
  todayStat: "/assets/dashboard/stat-upcoming.png",
  weekStat: "/assets/dashboard/stat-past.png",
  liveStat: "/assets/dashboard/stat-live.png",
} as const;

const sidebarItems = [
  { label: "Dashboard", href: "/dashboard", icon: House },
  { label: "Courses", href: "/dashboard/courses", icon: BookOpen },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "Live Classes", href: "/dashboard/live-classes", icon: Video, active: true },
  { label: "Community", href: "/dashboard/community", icon: MessageSquareText },
  { label: "Doubts", href: "/dashboard/doubts", icon: CircleHelp },
  { label: "Assignments", href: "/dashboard/assignments", icon: NotebookPen },
  { label: "Progress", href: "/dashboard/progress", icon: ChartNoAxesColumn },
  { label: "Certificates", href: "/dashboard/certificates", icon: Award },
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
] as const;

const statusMeta = {
  completed: {
    badgeTone: "success" as const,
    label: "Past Class",
  },
  live: {
    badgeTone: "danger" as const,
    label: "Live now",
  },
  upcoming: {
    badgeTone: "brand" as const,
    label: "Upcoming",
  },
} as const;

type LiveClassCardItem = LiveClassItem & {
  status: keyof typeof statusMeta;
};

function actionButtonStyles(className?: string) {
  return cx(
    "inline-flex items-center justify-center rounded-[10px] font-semibold transition-transform duration-150 ease-out hover:-translate-y-0.5",
    "bg-[#38c1ff] text-white shadow-[0_4px_12px_rgba(56,193,255,0.28)]",
    className,
  );
}

function formatScheduleTime(startTime: string, duration: number) {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  return `${start.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })} – ${end.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getScheduleHref(item: LiveClassItem) {
  return `/dashboard/live-classes/${item.id}`;
}

function LiveStatCard({
  title,
  value,
  image,
  meta,
  href,
}: {
  title: string;
  value: string;
  image: string;
  meta: string;
  href?: string;
}) {
  const content = (
    <article className="relative flex h-full flex-col rounded-[28px] bg-[#72d3ff] p-5 text-white shadow-[0_10px_25px_-5px_rgba(56,193,255,0.3),0_8px_10px_-6px_rgba(56,193,255,0.3)] transition-all duration-300 hover:translate-y-[-4px] hover:bg-[#6ed0fc] hover:shadow-[0_20px_25px_-5px_rgba(56,193,255,0.4),0_10px_10px_-5px_rgba(56,193,255,0.4)] sm:p-6">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="w-[104px] shrink-0 sm:w-[8.75rem]">
          <Image
            alt=""
            aria-hidden
            className="h-auto w-full object-contain drop-shadow-xl"
            height={140}
            src={image}
            width={140}
          />
        </div>
        <p className="text-[2.6rem] font-bold leading-none text-[#fec600] sm:text-[clamp(2.6rem,5vw,3.5rem)]">
          {value}
        </p>
      </div>

      <div className="mt-3">
        <p className="text-[1.1rem] font-bold leading-tight text-white sm:text-[1.25rem]">
          {title}
        </p>
        <p className="mt-1 max-w-[18rem] text-[12px] leading-relaxed text-white/88 sm:text-[13px]">
          {meta}
        </p>
      </div>
    </article>
  );

  return (
    <AnimCard className="h-full min-w-[200px] shrink-0 sm:min-w-0">
      {href ? (
        <Link className="block h-full" href={href}>
          {content}
        </Link>
      ) : (
        content
      )}
    </AnimCard>
  );
}

function LiveClassCard({
  item,
}: {
  item: LiveClassCardItem;
}) {
  const href = getScheduleHref(item);
  const actionLabel =
    item.status === "live"
      ? "Join now"
      : item.status === "completed"
        ? "Open replay"
        : "Enter class";

  return (
    <AnimCard>
      <article className="rounded-[24px] bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] ring-1 ring-black/5 sm:rounded-[24px] sm:p-6 sm:shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5 sm:space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusMeta[item.status].badgeTone} className="text-[10px] sm:text-[12px] px-2.5 py-0.5">
                {statusMeta[item.status].label}
              </Badge>
              <span className="rounded-full bg-[#f7f5f4] px-2.5 py-1 text-[11px] font-medium text-black/60 sm:text-[12px]">
                {formatShortDate(item.startTime)}
              </span>
            </div>

            <div>
              <h3 className="text-[1.15rem] font-semibold leading-[1.2] text-black sm:text-[clamp(1.25rem,2vw,1.55rem)]">
                {item.title}
              </h3>
              <p className="mt-1 text-[13px] text-[#8b8888] sm:text-[14px]">{item.courseTitle}</p>
            </div>
          </div>

          <div className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-[16px] bg-[#38c1ff]/10 text-[#38c1ff] sm:h-[60px] sm:w-[60px] sm:rounded-[18px]">
            {item.status === "completed" ? (
              <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6" />
            ) : (
              <Video className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <div className="rounded-[12px] bg-[#f7f5f4] px-3 py-2.5 sm:rounded-[14px] sm:px-4 sm:py-3">
            <div className="flex items-center gap-2 text-[12px] font-medium text-black/60 sm:text-[13px]">
              <Clock3 className="h-3.5 w-3.5 text-black/40" />
              <span className="truncate">{formatScheduleTime(item.startTime, item.duration)}</span>
            </div>
          </div>
          <div className="rounded-[12px] bg-[#f7f5f4] px-3 py-2.5 sm:rounded-[14px] sm:px-4 sm:py-3">
            <div className="flex items-center gap-2 text-[12px] font-medium text-black/60 sm:text-[13px]">
              <Users className="h-3.5 w-3.5 text-black/40" />
              <span className="truncate">{item.attendeeCount} joined</span>
            </div>
          </div>
          <div className="col-span-2 rounded-[12px] bg-[#f7f5f4] px-3 py-2.5 sm:col-span-1 sm:rounded-[14px] sm:px-4 sm:py-3">
            <div className="flex items-center gap-2 text-[12px] font-medium text-black/60 sm:text-[13px]">
              <CalendarClock className="h-3.5 w-3.5 text-black/40" />
              <span className="truncate">
                {item.status === "live"
                  ? "Already started"
                  : formatRelativeTime(item.startTime)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-black/5 pt-4 sm:mt-6 sm:gap-4 sm:pt-5">
          <p className="max-w-[32rem] text-[13px] leading-relaxed text-black/50">
            {item.status === "completed"
              ? "Revisit the session details and any follow-up material from your class history."
              : "Jump straight into the live classroom experience without leaving the dashboard."}
          </p>
          <Link className={actionButtonStyles("h-[40px] w-full px-4 text-[13px] sm:h-[42px] sm:w-auto")} href={href}>
            {actionLabel}
          </Link>
        </div>
      </article>
    </AnimCard>
  );
}

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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div>
          <h2 className="text-[1.75rem] font-bold tracking-tight text-black sm:text-[clamp(2.2rem,4vw,2.5rem)]">{title}</h2>
          <p className="mt-2.5 max-w-[42rem] text-[15px] leading-relaxed text-black/50 sm:text-[17px]">
            {description}
          </p>
        </div>
        <div className="shrink-0 self-start sm:self-auto mt-1 sm:mt-0">{accent}</div>
      </div>

      {items.length > 0 ? (
        <StaggerGrid className="grid gap-3 sm:gap-5 xl:grid-cols-2">
          {items.map((item) => (
            <LiveClassCard item={item} key={item.id} />
          ))}
        </StaggerGrid>
      ) : (
        <div className="rounded-[20px] bg-white px-5 py-10 text-center text-[14px] text-black/40 ring-1 ring-black/5 sm:px-6 sm:py-12 sm:text-[15px] sm:shadow-[0_4px_10px_rgba(0,0,0,0.04)]">
          {emptyDescription}
        </div>
      )}
    </div>
  );
}

function NextRoomCard({
  item,
}: {
  item: LiveClassCardItem | null;
}) {
  if (!item) {
    return (
      <AnimCard>
        <aside className="rounded-[32px] bg-white px-6 py-8 shadow-[0_14px_40px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-black/40">
            Next Room
          </p>
          <p className="mt-5 text-[1.4rem] font-bold text-black">Nothing scheduled yet</p>
          <p className="mt-3 text-[14px] leading-relaxed text-black/50">
            When a new live session is published for one of your enrolled courses,
            it will appear here with the fastest route into class.
          </p>
          <Link
            className={actionButtonStyles("mt-7 h-[44px] px-6 text-[14px] w-full")}
            href="/dashboard/courses"
          >
            Browse Courses
          </Link>
        </aside>
      </AnimCard>
    );
  }

  return (
    <AnimCard>
      <aside className="rounded-[32px] bg-white px-6 py-8 shadow-[0_14px_40px_rgba(15,23,42,0.08)] ring-1 ring-black/5">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-black/40">
          {item.status === "completed" ? "Latest Replay" : "Next Room"}
        </p>
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={statusMeta[item.status].badgeTone} className="px-3 py-1 text-[12px]">
              {statusMeta[item.status].label}
            </Badge>
            <span className="rounded-full bg-[#f7f5f4] px-3 py-1.5 text-[12px] font-medium text-black/60">
              {formatShortDate(item.startTime)}
            </span>
          </div>
          <div>
            <h3 className="text-[1.65rem] font-bold leading-tight text-black">
              {item.title}
            </h3>
            <p className="mt-1.5 text-[15px] text-[#8b8888]">{item.courseTitle}</p>
          </div>
          <div className="rounded-[20px] bg-[#f7f5f4] p-5">
            <div className="flex items-center gap-3 text-[14px] font-medium text-black/60">
              <Clock3 className="h-4.5 w-4.5 shrink-0 text-black/40" />
              <span>{formatScheduleTime(item.startTime, item.duration)}</span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-[14px] font-medium text-black/60">
              <CalendarClock className="h-4.5 w-4.5 shrink-0 text-black/40" />
              <span>
                {item.status === "live" ? "Already started" : formatRelativeTime(item.startTime)}
              </span>
            </div>
          </div>
          <Link
            className={actionButtonStyles("h-[48px] w-full gap-3 text-[15px]")}
            href={getScheduleHref(item)}
          >
            {item.status === "live"
              ? "Join Live Room"
              : item.status === "completed"
                ? "Open Replay"
                : "Open Classroom"}
            <ArrowRight className="h-4.5 w-4.5" />
          </Link>
        </div>
      </aside>
    </AnimCard>
  );
}

function QuickRouteCard({
  description,
  href,
  icon: Icon,
  title,
}: {
  description: string;
  href: string;
  icon: typeof Calendar;
  title: string;
}) {
  return (
    <AnimCard>
      <Link
        className="flex items-start gap-3.5 rounded-[20px] bg-white px-4 py-4 shadow-[0_4px_16px_rgba(15,23,42,0.04)] ring-1 ring-black/5 transition-transform active:scale-[0.98] sm:rounded-[20px] sm:shadow-[0_4px_10px_rgba(0,0,0,0.06)]"
        href={href}
      >
        <div className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[14px] bg-[#38c1ff]/10 text-[#38c1ff] sm:h-11 sm:w-11">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-0.5 sm:space-y-1">
          <p className="text-[14px] font-bold text-black sm:text-[15px]">{title}</p>
          <p className="text-[12px] leading-relaxed text-black/50 sm:text-[13px] sm:leading-6">{description}</p>
        </div>
      </Link>
    </AnimCard>
  );
}

// ─── Past Classes: grouped accordion by course ────────────────────────────────

type CourseGroup = {
  courseTitle: string;
  courseSlug: string;
  classes: LiveClassCardItem[];
};

function PastClassRow({ item }: { item: LiveClassCardItem }) {
  const replayHref = `/dashboard/live-classes/${item.id}/recording`;
  const date = new Date(item.startTime);
  const dateStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-center justify-between gap-4 border-t border-black/5 px-5 py-3.5 transition-colors hover:bg-[#38c1ff]/4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-[#38c1ff]/10 text-[#38c1ff]">
          <PlayCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-black">{item.title}</p>
          <p className="flex items-center gap-2 text-[12px] text-black/45">
            <Clock3 className="h-3 w-3 shrink-0" />
            {dateStr} · {timeStr}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden rounded-full bg-[#f0f9ff] px-2.5 py-1 text-[11px] font-medium text-[#38c1ff] sm:inline">
          <Users className="mr-1 inline h-3 w-3" />
          {item.attendeeCount} joined
        </span>
        <Link
          href={replayHref}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] bg-[#38c1ff] px-3.5 text-[12px] font-semibold text-white shadow-[0_4px_10px_rgba(56,193,255,0.25)] transition-transform hover:-translate-y-0.5"
        >
          Open Replay
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
    <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
      {/* Course header row – clickable */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#f9fafb]"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#38c1ff]/12 text-[#38c1ff]">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-black">{group.courseTitle}</p>
            <p className="text-[12px] text-black/45">
              {count} past {count === 1 ? "session" : "sessions"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden rounded-full bg-[#f7f5f4] px-3 py-1 text-[12px] font-semibold text-black/55 sm:inline">
            {count} recorded
          </span>
          <ChevronDown
            className={cx(
              "h-5 w-5 text-black/35 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      {/* Expandable class list */}
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

function PastClassesSection({ items }: { items: LiveClassCardItem[] }) {
  // Group by course
  const groups = useMemo<CourseGroup[]>(() => {
    const map = new Map<string, CourseGroup>();
    for (const item of items) {
      const key = item.courseSlug;
      if (!map.has(key)) {
        map.set(key, { courseTitle: item.courseTitle, courseSlug: item.courseSlug, classes: [] });
      }
      map.get(key)!.classes.push(item);
    }
    return Array.from(map.values());
  }, [items]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Section header */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div>
          <h2 className="text-[1.75rem] font-bold tracking-tight text-black sm:text-[clamp(2.2rem,4vw,2.5rem)]">
            Past Classes
          </h2>
          <p className="mt-2.5 max-w-[42rem] text-[15px] leading-relaxed text-black/50 sm:text-[17px]">
            Browse replays by course — click any course to reveal its recorded sessions.
          </p>
        </div>
        <span className="shrink-0 self-start rounded-full bg-black/5 px-3 py-1 text-sm font-semibold text-black/52 sm:self-auto">
          {items.length} saved
        </span>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-[20px] bg-white px-5 py-10 text-center text-[14px] text-black/40 ring-1 ring-black/5 sm:px-6 sm:py-12 sm:text-[15px]">
          No completed live classes are available yet.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <PastCourseAccordion key={group.courseSlug} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

export function StudentLiveClassSchedule() {
  const { user } = useAuth();
  const [data, setData] = useState<LiveClassData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/live-classes")
      .then((response) => response.json())
      .then((json) => {
        if (active && json.success) {
          setData(json.data);
        }
      })
      .catch((error) => {
        console.error("Failed to load class schedule", error);
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

  const displayName = user?.name?.trim() || "Student";
  const liveItems = useMemo<LiveClassCardItem[]>(
    () => data?.live.map((item) => ({ ...item, status: "live" })) ?? [],
    [data],
  );
  const upcomingItems = useMemo<LiveClassCardItem[]>(
    () => data?.upcoming.map((item) => ({ ...item, status: "upcoming" })) ?? [],
    [data],
  );
  const completedItems = useMemo<LiveClassCardItem[]>(
    () => data?.completed.map((item) => ({ ...item, status: "completed" })) ?? [],
    [data],
  );
  const nextRoom = useMemo(() => {
    return liveItems[0] ?? upcomingItems[0] ?? completedItems[0] ?? null;
  }, [completedItems, liveItems, upcomingItems]);
  const liveNowCount = data?.summary.live ?? 0;
  const windowLabel = data
    ? "Across your enrolled live classes"
    : "Loading classrooms...";
  const upcomingHref = upcomingItems[0]
    ? getScheduleHref(upcomingItems[0])
    : "/dashboard/live-classes";
  const completedHref = completedItems[0]
    ? getScheduleHref(completedItems[0])
    : "/dashboard/live-classes";
  const liveHref = liveItems[0]
    ? getScheduleHref(liveItems[0])
    : "/dashboard/live-classes";

  return (
    <PageTransition>
      <main className="min-h-screen overflow-x-hidden bg-[#f9fafb] pb-24 sm:bg-[#f7f5f4] sm:pb-0">


        <div className="mx-auto max-w-[1920px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-0 xl:py-8">
          <div className="grid gap-4 sm:gap-6 xl:grid-cols-[222px_minmax(0,1fr)] xl:items-start">
            <RevealSection className="hidden xl:block xl:pr-7">
              <aside className="sticky top-3 z-20 overflow-hidden rounded-l-[0] rounded-r-[40px] bg-[linear-gradient(180deg,#ffbf00_0%,#ffd86a_100%)] px-4 py-12 shadow-[0_18px_48px_rgba(254,198,0,0.18)]">
                <nav className="flex flex-col gap-1">
                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        className={cx(
                          "flex items-center min-h-[56px] gap-4 rounded-[22px] px-5 py-3 text-[18px] font-medium text-black transition-colors duration-150",
                          ("active" in item && item.active)
                            ? "bg-white/40 shadow-sm"
                            : "hover:bg-white/20",
                        )}
                        href={item.href}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="whitespace-nowrap">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </aside>
            </RevealSection>

            <section className="min-w-0 px-0 xl:pr-10">
              <div className="mx-auto max-w-[1160px] space-y-6 sm:space-y-10">
                <RevealSection>
                  <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#38c1ff_0%,#00a7fa_100%)] px-5 py-8 text-white shadow-[0_12px_32px_rgba(56,193,255,0.25)] sm:rounded-[32px] sm:px-10 sm:py-10 sm:shadow-[0_18px_44px_rgba(56,193,255,0.24)]">
                    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.22),transparent_70%)] sm:block" />
                    <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl sm:hidden" />
                    <div className="relative z-10 grid gap-6 sm:gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] xl:items-center">
                      <div className="max-w-[42rem] space-y-4 sm:space-y-6">
                        <div>
                          <div className="mb-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md sm:px-4 sm:py-1.5 sm:text-[11px]">
                            Live Classes
                          </div>
                          <h1 className="text-[1.85rem] font-bold leading-[1.08] tracking-tight sm:max-w-none sm:text-[clamp(1.95rem,4vw,2.55rem)] sm:leading-[1.02] sm:tracking-[-0.05em]">
                            Jump into every live session from one polished workspace.
                          </h1>
                          <p className="mt-3 text-[14px] leading-relaxed text-white/90 sm:max-w-[30rem] sm:text-[16px] sm:leading-7 sm:text-white/92">
                            Your live classes, next sessions, and quick routes now sit in the same
                            student-dashboard language as the rest of the learning flow.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                          <span className="rounded-full bg-black/10 px-3 py-1.5 text-[12px] font-medium text-white backdrop-blur sm:px-4 sm:text-[14px]">
                            {windowLabel}
                          </span>
                          {liveNowCount > 0 ? (
                            <span className="flex items-center gap-1.5 rounded-full bg-[#ff3d00] px-3 py-1.5 text-[12px] font-bold text-white shadow-[0_2px_10px_rgba(255,61,0,0.4)] sm:gap-2 sm:px-4 sm:text-[14px]">
                              <Radio className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              {liveNowCount} live now
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <FloatPulse className="hidden sm:mx-auto sm:block xl:mx-0 xl:justify-self-end">
                        <Image
                          alt=""
                          aria-hidden
                          className="h-auto w-[220px] object-contain opacity-95 drop-shadow-[0_18px_40px_rgba(0,0,0,0.12)] sm:w-[320px] xl:w-[360px]"
                          height={852}
                          src={assets.heroIllustration}
                          width={1561}
                        />
                      </FloatPulse>
                    </div>
                  </div>
                </RevealSection>

                <RevealSection delay={0.04}>
                  <div className="scrollbar-none -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0">
                    <LiveStatCard
                      image={assets.todayStat}
                      meta="Classes waiting for their start time."
                      title="Upcoming Classes"
                      value={loading ? "…" : String(data?.summary.upcoming ?? 0)}
                      href={upcomingHref}
                    />
                    <LiveStatCard
                      image={assets.weekStat}
                      meta="Completed sessions ready to revisit."
                      title="Past Classes"
                      value={loading ? "…" : String(data?.summary.completed ?? 0)}
                      href={completedHref}
                    />
                    <LiveStatCard
                      image={assets.liveStat}
                      meta="Rooms that can be joined immediately."
                      title="Ongoing Classes"
                      value={loading ? "…" : String(data?.summary.live ?? 0)}
                      href={liveHref}
                    />
                  </div>
                </RevealSection>

                {loading ? (
                  <RevealSection delay={0.06}>
                    <div className="flex min-h-[16rem] items-center justify-center rounded-[24px] bg-white text-black/50 shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
                      <div className="flex items-center gap-3">
                        <Spinner className="h-6 w-6 border-[#38c1ff] text-[#38c1ff]" />
                        Loading your live-class schedule...
                      </div>
                    </div>
                  </RevealSection>
                ) : !data ? (
                  <RevealSection delay={0.08}>
                    <EmptyState
                      description="We could not load the live-class schedule right now. Refresh the page and try again."
                      icon={<CalendarClock className="h-6 w-6" />}
                      title="Schedule unavailable"
                    />
                  </RevealSection>
                ) : (
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                    <div className="space-y-10">
                      {liveItems.length > 0 ? (
                        <RevealSection delay={0.08}>
                          <ScheduleSection
                            accent={
                              <span className="rounded-full bg-[#ffebe5] px-3 py-1 text-sm font-semibold text-[#ff5e2f]">
                                {liveItems.length} active
                              </span>
                            }
                            description="Live classrooms are surfaced first so you can jump straight in without hunting through the rest of the schedule."
                            emptyDescription="No sessions are currently live."
                            items={liveItems}
                            title="Ongoing Classes"
                          />
                        </RevealSection>
                      ) : null}

                      <RevealSection delay={0.1}>
                        <ScheduleSection
                          accent={
                            <span className="rounded-full bg-[#38c1ff]/10 px-3 py-1 text-sm font-semibold text-[#38c1ff]">
                              {upcomingItems.length} sessions
                            </span>
                          }
                          description="Every upcoming classroom now routes into the dedicated upcoming-class detail screen instead of the old day-based flow."
                          emptyDescription="No upcoming classes are scheduled right now."
                          items={upcomingItems}
                          title="Upcoming Classes"
                        />
                      </RevealSection>

                      <RevealSection delay={0.12}>
                        <PastClassesSection items={completedItems} />
                      </RevealSection>
                    </div>

                    <div className="order-first space-y-4 sm:space-y-6 xl:order-none xl:sticky xl:top-6">
                      <RevealSection delay={0.08}>
                        <NextRoomCard item={nextRoom} />
                      </RevealSection>

                      <RevealSection delay={0.12}>
                        <div className="space-y-4">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-black/45">
                            Quick Routes
                          </p>

                          <QuickRouteCard
                            description="Check your broader calendar view and everything else coming up."
                            href="/dashboard/upcoming"
                            icon={Calendar}
                            title="Open Calendar"
                          />
                          <QuickRouteCard
                            description="Jump back to your course library before a session begins."
                            href="/dashboard/courses"
                            icon={BookOpen}
                            title="Browse Courses"
                          />
                          <QuickRouteCard
                            description="Head into the student community for follow-up questions and discussion."
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
