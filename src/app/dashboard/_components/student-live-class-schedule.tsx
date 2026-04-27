"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarClock,
  Clock3,
  MessageSquareText,
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
  headerAvatar: "https://www.figma.com/api/mcp/asset/021745ae-afe4-4dce-ad5c-2dd5ad2195e1",
  heroIllustration: "https://www.figma.com/api/mcp/asset/ed4da357-c8f5-410a-8e68-45347e8c1af8",
  todayStat: "https://www.figma.com/api/mcp/asset/5890be02-a91e-46c1-86e1-2c309e51e4c9",
  weekStat: "https://www.figma.com/api/mcp/asset/78a502ad-9c8c-4041-b5b4-0820b424e6b5",
  liveStat: "https://www.figma.com/api/mcp/asset/3fda4e93-3e77-4bb0-8b50-0d4624b13ec4",
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
    label: "Completed",
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
    "inline-flex items-center justify-center rounded-[10px] font-semibold transition-transform duration-[var(--transition-fast)] ease-[var(--ease-standard)] hover:-translate-y-0.5",
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
    <article className="h-full rounded-[20px] bg-[#72d3ff] px-5 py-4 text-white shadow-[0_4px_9.2px_rgba(0,0,0,0.25)] transition-colors hover:bg-[#6ed0fc]">
      <div className="flex items-start justify-between gap-4">
        <Image
          alt={title}
          className="h-auto w-[5.5rem] object-contain sm:w-[6.8rem]"
          height={96}
          src={image}
          width={109}
        />
        <p className="pt-3 text-[clamp(2.6rem,6vw,3.75rem)] leading-none text-[#fec600]">
          {value}
        </p>
      </div>
      <p className="mt-4 text-[clamp(1rem,2vw,1.5rem)] font-semibold text-white">{title}</p>
      <p className="mt-1 text-[13px] text-white/90">{meta}</p>
    </article>
  );

  return (
    <AnimCard className="h-full">
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
      <article className="rounded-[24px] bg-white p-5 shadow-[0_4px_10px_rgba(0,0,0,0.12)]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusMeta[item.status].badgeTone}>
                {statusMeta[item.status].label}
              </Badge>
              <span className="rounded-full bg-[#f7f5f4] px-3 py-1 text-[12px] text-black/58">
                {formatShortDate(item.startTime)}
              </span>
            </div>

            <div>
              <h3 className="text-[clamp(1.25rem,2vw,1.55rem)] font-medium leading-[1.15] text-black">
                {item.title}
              </h3>
              <p className="mt-1 text-[14px] text-[#8b8888]">{item.courseTitle}</p>
            </div>
          </div>

          <div className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-[18px] bg-[#38c1ff]/12 text-[#38c1ff]">
            {item.status === "completed" ? (
              <CalendarClock className="h-6 w-6" />
            ) : (
              <Video className="h-6 w-6" />
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[14px] bg-[#f7f5f4] px-4 py-3">
            <div className="flex items-center gap-2 text-[13px] text-black/62">
              <Clock3 className="h-4 w-4 text-black/40" />
              <span>{formatScheduleTime(item.startTime, item.duration)}</span>
            </div>
          </div>
          <div className="rounded-[14px] bg-[#f7f5f4] px-4 py-3">
            <div className="flex items-center gap-2 text-[13px] text-black/62">
              <Users className="h-4 w-4 text-black/40" />
              <span>{item.attendeeCount} joined</span>
            </div>
          </div>
          <div className="rounded-[14px] bg-[#f7f5f4] px-4 py-3">
            <div className="flex items-center gap-2 text-[13px] text-black/62">
              <CalendarClock className="h-4 w-4 text-black/40" />
              <span>
                {item.status === "live"
                  ? "Already started"
                  : formatRelativeTime(item.startTime)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-black/6 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[32rem] text-[13px] leading-6 text-black/54">
            {item.status === "completed"
              ? "Revisit the session details and any follow-up material from your class history."
              : "Jump straight into the live classroom experience without leaving the dashboard."}
          </p>
          <Link className={actionButtonStyles("h-[38px] px-4 text-[13px]")} href={href}>
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[clamp(1.7rem,3vw,1.95rem)] font-medium text-black">{title}</h2>
          <p className="mt-2 max-w-[42rem] text-[15px] leading-6 text-black/56">
            {description}
          </p>
        </div>
        <div className="shrink-0">{accent}</div>
      </div>

      {items.length > 0 ? (
        <StaggerGrid className="grid gap-5 xl:grid-cols-2">
          {items.map((item) => (
            <LiveClassCard item={item} key={item.id} />
          ))}
        </StaggerGrid>
      ) : (
        <div className="rounded-[20px] bg-white px-6 py-12 text-center text-[15px] text-black/50 shadow-[0_4px_10px_rgba(0,0,0,0.06)]">
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
        <aside className="rounded-[24px] bg-white px-5 py-6 shadow-[0_4px_10px_rgba(0,0,0,0.12)]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-black/45">
            Next Room
          </p>
          <p className="mt-4 text-[1.1rem] font-semibold text-black">Nothing scheduled yet</p>
          <p className="mt-2 text-[14px] leading-7 text-black/58">
            When a new live session is published for one of your enrolled courses,
            it will appear here with the fastest route into class.
          </p>
          <Link
            className={actionButtonStyles("mt-5 h-[38px] px-4 text-[13px]")}
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
      <aside className="rounded-[24px] bg-white px-5 py-6 shadow-[0_4px_10px_rgba(0,0,0,0.12)]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-black/45">
          {item.status === "completed" ? "Latest Replay" : "Next Room"}
        </p>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Badge tone={statusMeta[item.status].badgeTone}>
              {statusMeta[item.status].label}
            </Badge>
            <span className="rounded-full bg-[#f7f5f4] px-3 py-1 text-[12px] text-black/58">
              {formatShortDate(item.startTime)}
            </span>
          </div>
          <div>
            <h3 className="text-[1.25rem] font-semibold leading-[1.15] text-black">
              {item.title}
            </h3>
            <p className="mt-1 text-[14px] text-[#8b8888]">{item.courseTitle}</p>
          </div>
          <div className="rounded-[16px] bg-[#f7f5f4] px-4 py-4">
            <div className="flex items-center gap-2 text-[13px] text-black/62">
              <Clock3 className="h-4 w-4 text-black/40" />
              <span>{formatScheduleTime(item.startTime, item.duration)}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[13px] text-black/62">
              <CalendarClock className="h-4 w-4 text-black/40" />
              <span>
                {item.status === "live" ? "Already started" : formatRelativeTime(item.startTime)}
              </span>
            </div>
          </div>
          <Link
            className={actionButtonStyles("h-[40px] w-full gap-2 text-[14px]")}
            href={getScheduleHref(item)}
          >
            {item.status === "live"
              ? "Join Live Room"
              : item.status === "completed"
                ? "Open Replay"
                : "Open Classroom"}
            <ArrowRight className="h-4 w-4" />
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
        className="flex items-start gap-3 rounded-[20px] bg-white px-4 py-4 shadow-[0_4px_10px_rgba(0,0,0,0.08)]"
        href={href}
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#38c1ff]/12 text-[#38c1ff]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-[15px] font-semibold text-black">{title}</p>
          <p className="text-[13px] leading-6 text-black/54">{description}</p>
        </div>
      </Link>
    </AnimCard>
  );
}

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
      <main className="min-h-screen overflow-x-hidden bg-[#f7f5f4]">
        <header className="border-b border-black/5 bg-white/88 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1920px] items-center gap-4 px-5 py-4 sm:px-6 lg:px-8 xl:px-14">
            <Link className="shrink-0" href="/dashboard">
              <Image
                alt={brand.fullName}
                className="h-auto w-[150px] object-contain sm:w-[177px]"
                height={74}
                priority
                src={brand.logoSrc}
                width={177}
              />
            </Link>

            <div className="hidden min-w-0 flex-1 lg:block">
              <GlobalSearch />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <NotificationsDropdown />

              <div className="flex items-center gap-2.5">
                <div className="overflow-hidden rounded-full border-4 border-[#925fe2] bg-white shadow-[8px_8px_48px_8px_rgba(0,0,0,0.24)]">
                  <Image
                    alt={displayName}
                    className="h-10 w-10 object-cover"
                    height={48}
                    src={assets.headerAvatar}
                    width={48}
                  />
                </div>
                <p className="hidden text-[15px] font-semibold text-black sm:block">
                  {displayName}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1920px] px-4 py-6 sm:px-6 lg:px-8 xl:px-0 xl:py-8">
          <div className="grid gap-6 xl:grid-cols-[222px_minmax(0,1fr)] xl:items-start">
            <RevealSection className="xl:pr-7">
              <aside className="overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#ffbf00_0%,#ffd86a_100%)] px-4 py-4 shadow-[0_18px_48px_rgba(254,198,0,0.18)] xl:sticky xl:top-6 xl:min-h-[530px] xl:rounded-l-[0] xl:rounded-r-[40px] xl:px-7 xl:py-12">
                <nav className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:gap-1 xl:overflow-visible">
                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        className={cx(
                          "flex min-w-max items-center gap-4 rounded-[22px] px-4 py-3 text-[15px] font-medium text-black transition-colors duration-[var(--transition-fast)] xl:min-h-[56px] xl:px-5 xl:text-[18px]",
                          ("active" in item && item.active) ? "bg-white/40 shadow-sm" : "hover:bg-white/20",
                        )}
                        href={item.href}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </aside>
            </RevealSection>

            <section className="px-0 xl:pr-10">
              <div className="mx-auto max-w-[1160px] space-y-10">
                <RevealSection>
                  <div className="relative overflow-hidden rounded-[24px] bg-[#38c1ff] px-6 py-8 text-white shadow-[0_4px_10px_rgba(0,0,0,0.2)] sm:px-10 sm:py-10">
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.22),transparent_70%)]" />
                    <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-center">
                      <div className="max-w-[42rem] space-y-6">
                        <div>
                          <div className="mb-4 inline-flex rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                            Live Classes
                          </div>
                          <h1 className="text-[clamp(1.95rem,4vw,2.55rem)] font-semibold tracking-[-0.03em]">
                            Jump into every live session from one polished workspace.
                          </h1>
                          <p className="mt-3 text-[16px] leading-7 text-white/92">
                            Your live classes, next sessions, and quick routes now sit in the same
                            student-dashboard language as the rest of the learning flow.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-black/10 px-4 py-1.5 text-[14px] font-medium text-white backdrop-blur">
                            {windowLabel}
                          </span>
                          {liveNowCount > 0 ? (
                            <span className="flex items-center gap-2 rounded-full bg-[#ff3d00] px-4 py-1.5 text-[14px] font-medium text-white shadow-[0_2px_10px_rgba(255,61,0,0.4)]">
                              <Radio className="h-4 w-4" />
                              {liveNowCount} live now
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <FloatPulse className="mx-auto xl:mx-0 xl:justify-self-end">
                        <Image
                          alt="Live class illustration"
                          className="h-auto w-[210px] object-contain sm:w-[250px]"
                          height={240}
                          src={assets.heroIllustration}
                          width={250}
                        />
                      </FloatPulse>
                    </div>
                  </div>
                </RevealSection>

                <RevealSection delay={0.04}>
                  <div className="grid gap-5 md:grid-cols-3">
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
                        <ScheduleSection
                          accent={
                            <span className="rounded-full bg-black/5 px-3 py-1 text-sm font-semibold text-black/52">
                              {completedItems.length} saved
                            </span>
                          }
                          description="Completed sessions now route into the past-class page so the replay state matches the button label."
                          emptyDescription="No completed live classes are available yet."
                          items={completedItems}
                          title="Past Classes"
                        />
                      </RevealSection>
                    </div>

                    <div className="space-y-6 xl:sticky xl:top-6">
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
