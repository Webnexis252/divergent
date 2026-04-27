"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  LayoutDashboard,
  LogIn,
  MessageCircleMore,
  PhoneOff,
  PlayCircle,
  Radio,
  Video,
  type LucideIcon,
} from "lucide-react";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { Badge } from "@/components/ui/badge";

import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { brand } from "@/lib/brand";
import { cx } from "@/lib/cx";
import { formatRelativeTime, formatShortDate } from "@/lib/date-format";
import type {
  LiveClassData,
} from "@/lib/live-class-types";
import {
  AnimCard,
  FloatPulse,
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "./motion-wrappers";
import {
  assets,
  toneMeta,
  sidebarItems,
  buildMeetingUrl,
  getSessionTone,
  getStateSteps,
  getToneHighlights,
  formatSessionTime,
  formatLongSessionDate,
  formatSessionWindow,
  actionButtonStyles,
} from "@/lib/live-class-utils";
import { ClassroomChat } from "./classroom-chat";
import { VideoConference } from "./video-conference";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";





function MetricCard({
  hint,
  icon: Icon,
  label,
  value,
}: {
  hint: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <AnimCard>
      <article className="rounded-[22px] bg-white px-5 py-5 shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div className="grid h-11 w-11 place-items-center rounded-[16px] bg-[#38c1ff]/10 text-[#38c1ff]">
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-right text-[12px] font-semibold uppercase tracking-[0.14em] text-black/42">
            {label}
          </p>
        </div>
        <p className="mt-5 text-[1.15rem] font-semibold leading-[1.25] text-black">{value}</p>
        <p className="mt-2 text-[13px] leading-6 text-black/52">{hint}</p>
      </article>
    </AnimCard>
  );
}

function RightRailLink({
  description,
  href,
  icon: Icon,
  title,
}: {
  description: string;
  href: string;
  icon: LucideIcon;
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

export function StudentLiveClassroomPage({
  brandHref,
  dataEndpoint,
}: {
  brandHref: string;
  dataEndpoint: string;
}) {
  const { user } = useAuth();
  const [messagesOpen, setMessagesOpen] = useState(true);
  const [meetStarted, setMeetStarted] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  const fetcher = (url: string) => apiClient.get<LiveClassData>(url);
  const { data, isLoading: loading } = useSWR(dataEndpoint, fetcher);

  const tone = getSessionTone(data ?? null);
  const focusClass = useMemo(() => {
    if (!data) return null;
    return data.live[0] ?? data.upcoming[0] ?? data.completed[0] ?? null;
  }, [data]);
  const meta = toneMeta[tone];
  const displayName = user?.name?.trim() || "Student";



  const markAttendance = useCallback(
    async (status: "JOIN" | "LEAVE") => {
      if (!focusClass?.id) return;

      try {
        await fetch(`/api/live-classes/${focusClass.id}/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        if (status === "JOIN") {
          setAttendanceMarked(true);
        }
      } catch (error) {
        console.error("Failed to mark attendance", error);
      }
    },
    [focusClass],
  );

  const meetingIframeUrl = useMemo(() => {
    if (!focusClass?.id) return null;
    return buildMeetingUrl(focusClass.id, focusClass.meetingUrl, user?.name ?? undefined);
  }, [focusClass, user?.name]);

  const startMeeting = useCallback(() => {
    if (!focusClass?.id) return;

    setMeetStarted(true);
    if (!attendanceMarked) {
      void markAttendance("JOIN");
    }
  }, [attendanceMarked, focusClass?.id, markAttendance]);

  const endMeeting = useCallback(() => {
    setMeetStarted(false);
    void markAttendance("LEAVE");
  }, [markAttendance]);

  useEffect(() => {
    const handleUnload = () => {
      if (meetStarted && focusClass?.id) {
        fetch(`/api/live-classes/${focusClass.id}/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: "LEAVE" }),
          keepalive: true,
        }).catch(console.error);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [meetStarted, focusClass?.id]);

  const courseHref = focusClass
    ? `/dashboard/courses/${focusClass.courseSlug}`
    : "/dashboard/courses";
  const primaryHref =
    tone === "completed" && focusClass
      ? focusClass.recordingUrl ?? courseHref
      : courseHref;
  const stateSteps = getStateSteps(tone, focusClass, attendanceMarked);
  const highlights =
    focusClass && tone !== "empty"
      ? getToneHighlights(focusClass, tone, attendanceMarked)
      : [];
  const primaryLabel =
    tone === "live"
      ? meetStarted
        ? "End Session"
        : "Join Class"
      : tone === "upcoming"
        ? meetStarted
          ? "Leave Room"
          : "Enter Class"
        : meta.primaryLabel;



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
                    src={user?.image || assets.headerAvatar}
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
                          ("active" in item && item.active) && "bg-white/16",
                        )}
                        href={item.href}
                      >
                        <Icon className="h-[22px] w-[22px] stroke-[2]" aria-hidden />
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
                  <div
                    className={cx(
                      "relative overflow-hidden rounded-[24px] px-6 py-8 shadow-[0_4px_10px_rgba(0,0,0,0.16)] sm:px-8 sm:py-10",
                      meta.accentClass,
                    )}
                  >
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-[45%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.28),transparent_68%)]" />
                    <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-center">
                      <div className="max-w-[42rem] space-y-6">
                        <div>
                          <div className="mb-4 inline-flex rounded-full bg-black/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em]">
                            {meta.heroEyebrow}
                          </div>
                          <div className="mb-4 flex flex-wrap items-center gap-3">
                            <Badge tone={meta.badgeTone}>{meta.badgeLabel}</Badge>
                            {tone === "live" ? (
                              <span className="flex items-center gap-2 rounded-full bg-[#ffebe5] px-4 py-1.5 text-[13px] font-semibold text-[#ff5e2f] shadow-[0_2px_10px_rgba(255,94,47,0.18)]">
                                <Radio className="h-4 w-4" />
                                Room open
                              </span>
                            ) : null}
                            {attendanceMarked ? (
                              <span className="flex items-center gap-2 rounded-full bg-[#f0fdf4] px-4 py-1.5 text-[13px] font-semibold text-[#15803d]">
                                <CheckCircle2 className="h-4 w-4" />
                                Attending
                              </span>
                            ) : null}
                          </div>
                          <h1 className="max-w-[18ch] text-[clamp(2rem,4vw,2.85rem)] font-semibold leading-[1.06] tracking-[-0.04em]">
                            {focusClass?.title ?? meta.heroTitle}
                          </h1>
                          <p className="mt-3 max-w-[45rem] text-[16px] leading-7 text-current/88">
                            {focusClass?.description?.trim() || meta.heroDescription}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {focusClass ? (
                            <span className="rounded-full bg-black/10 px-4 py-1.5 text-[14px] font-medium backdrop-blur">
                              {formatLongSessionDate(focusClass.startTime)}
                            </span>
                          ) : null}
                          {focusClass ? (
                            <span className="rounded-full bg-black/10 px-4 py-1.5 text-[14px] font-medium backdrop-blur">
                              {formatSessionWindow(focusClass.startTime, focusClass.duration)}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {tone === "completed" ? (
                            <Link
                              className={actionButtonStyles(meta.actionClass)}
                              href={primaryHref}
                              target={focusClass?.recordingUrl ? "_blank" : undefined}
                            >
                              <PlayCircle className="h-4 w-4" />
                              {primaryLabel}
                            </Link>
                          ) : (
                            <button
                              className={actionButtonStyles(meta.actionClass)}
                              onClick={meetStarted ? endMeeting : startMeeting}
                              type="button"
                            >
                              {meetStarted ? (
                                <PhoneOff className="h-4 w-4" />
                              ) : (
                                <LogIn className="h-4 w-4" />
                              )}
                              {primaryLabel}
                            </button>
                          )}

                          <button
                            className={actionButtonStyles(attendanceMarked ? "bg-[#f0fdf4] text-[#15803d]" : meta.secondaryActionClass)}
                            onClick={() => markAttendance("JOIN")}
                            disabled={attendanceMarked || tone !== "live"}
                            type="button"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {attendanceMarked ? "Attendance Marked" : "Attendance"}
                          </button>

                          <Link
                            className={actionButtonStyles(meta.secondaryActionClass)}
                            href={courseHref}
                          >
                            <BookOpen className="h-4 w-4" />
                            Open Course
                          </Link>

                          <button
                            className={actionButtonStyles(meta.secondaryActionClass)}
                            onClick={() => setMessagesOpen((current) => !current)}
                            type="button"
                          >
                            <MessageCircleMore className="h-4 w-4" />
                            {messagesOpen ? "Hide Thread" : "Show Thread"}
                          </button>
                        </div>
                      </div>

                      <FloatPulse className="mx-auto w-full max-w-[300px] xl:mx-0 xl:justify-self-end">
                        <div className="rounded-[28px] bg-white/16 p-5 backdrop-blur-md">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-current/72">
                            {meta.railLabel}
                          </p>
                          <p className="mt-4 text-[2rem] font-semibold tracking-[-0.04em]">
                            {focusClass ? meta.railValue : "Unavailable"}
                          </p>
                          <div className="mt-5 space-y-3">
                            <div className="rounded-[18px] bg-black/10 px-4 py-4">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-current/62">
                                Session Date
                              </p>
                              <p className="mt-2 text-[15px] font-semibold">
                                {focusClass
                                  ? formatShortDate(focusClass.startTime)
                                  : "Pending"}
                              </p>
                            </div>
                            <div className="rounded-[18px] bg-black/10 px-4 py-4">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-current/62">
                                Relative Time
                              </p>
                              <p className="mt-2 text-[15px] font-semibold">
                                {focusClass
                                  ? tone === "live"
                                    ? "Happening now"
                                    : formatRelativeTime(focusClass.startTime)
                                  : "Unknown"}
                              </p>
                            </div>
                            <div className="rounded-[18px] bg-black/10 px-4 py-4">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-current/62">
                                Learners
                              </p>
                              <p className="mt-2 text-[15px] font-semibold">
                                {focusClass ? `${focusClass.attendeeCount} joined` : "0 joined"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </FloatPulse>
                    </div>
                  </div>
                </RevealSection>

                {loading ? (
                  <RevealSection delay={0.04}>
                    <div className="flex min-h-[16rem] items-center justify-center rounded-[24px] bg-white text-black/50 shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
                      <div className="flex items-center gap-3">
                        <Spinner className="h-6 w-6 border-[#38c1ff] text-[#38c1ff]" />
                        Loading classroom details...
                      </div>
                    </div>
                  </RevealSection>
                ) : !focusClass ? (
                  <RevealSection delay={0.06}>
                    <EmptyState
                      description="We could not load this class right now. Refresh the page and try again."
                      icon={<CalendarClock className="h-6 w-6" />}
                      title="Class unavailable"
                    />
                  </RevealSection>
                ) : (
                  <>
                    <RevealSection delay={0.04}>
                      <StaggerGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                          hint="Exact calendar date for this class."
                          icon={CalendarClock}
                          label="Date"
                          value={formatShortDate(focusClass.startTime)}
                        />
                        <MetricCard
                          hint="Start and finish window for the room."
                          icon={Clock3}
                          label="Time"
                          value={formatSessionWindow(focusClass.startTime, focusClass.duration)}
                        />
                        <MetricCard
                          hint="The course context this class belongs to."
                          icon={BookOpen}
                          label="Course"
                          value={focusClass.courseTitle}
                        />
                        <MetricCard
                          hint="Learners who have already been counted in attendance."
                          icon={Video}
                          label="Joined"
                          value={`${focusClass.attendeeCount}`}
                        />
                      </StaggerGrid>
                    </RevealSection>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
                      <div className="space-y-6">
                        <RevealSection delay={0.08}>
                          <section className="rounded-[24px] bg-white p-6 shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
                            <div className="flex flex-col gap-3 border-b border-black/6 pb-5 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-black/42">
                                  Classroom Stage
                                </p>
                                <h2 className="mt-2 text-[1.65rem] font-semibold tracking-[-0.04em] text-black">
                                  Stay inside the class without leaving the student flow.
                                </h2>
                              </div>
                              <Badge tone={meta.badgeTone}>{meta.badgeLabel}</Badge>
                            </div>

                            <div className="mt-6">
                              <AnimatePresence mode="wait">
                                {meetStarted && meetingIframeUrl && tone !== "completed" ? (
                                  <VideoConference
                                    meetingIframeUrl={meetingIframeUrl}
                                    onEndMeeting={endMeeting}
                                  />
                                ) : (
                                  <motion.div
                                    key={tone}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={cx(
                                      "overflow-hidden rounded-[24px] px-6 py-6 shadow-[0_10px_24px_rgba(0,0,0,0.08)] sm:px-7 sm:py-7",
                                      meta.stageClass,
                                    )}
                                    exit={{ opacity: 0, y: 12 }}
                                    initial={{ opacity: 0, y: 12 }}
                                    transition={{ duration: 0.28 }}
                                  >
                                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
                                      <div className="space-y-5">
                                        <div className="inline-flex rounded-full bg-black/12 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.16em]">
                                          {meta.heroEyebrow}
                                        </div>
                                        <div>
                                          <h3 className="text-[1.85rem] font-semibold leading-[1.12] tracking-[-0.04em]">
                                            {tone === "live"
                                              ? "Open the live room the moment you are ready."
                                              : tone === "completed"
                                                ? "Everything from this class now lives in review mode."
                                                : "This classroom is staged for the upcoming session."}
                                          </h3>
                                          <p className="mt-3 max-w-[42rem] text-[15px] leading-7 text-current/86">
                                            {tone === "live"
                                              ? "Join the stream right here, keep the thread visible, and use the course route whenever you need lesson context."
                                              : tone === "completed"
                                                ? "Use the recording if it is ready, scroll through the class thread, and step back into the course for the next lesson."
                                                : "The room, thread, and course route stay tied together here so you can arrive prepared without jumping across pages."}
                                          </p>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-3">
                                          {highlights.map((highlight) => (
                                            <div
                                              key={highlight.label}
                                              className="rounded-[18px] bg-black/10 px-4 py-4"
                                            >
                                              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-current/62">
                                                {highlight.label}
                                              </p>
                                              <p className="mt-3 text-[15px] font-semibold leading-6">
                                                {highlight.value}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <FloatPulse className="mx-auto w-full max-w-[260px]">
                                        <div className="rounded-[24px] bg-white/14 p-5 backdrop-blur">
                                          <div className="grid h-16 w-16 place-items-center rounded-[20px] bg-white/20 text-current">
                                            {tone === "completed" ? (
                                              <PlayCircle className="h-8 w-8" />
                                            ) : tone === "live" ? (
                                              <Radio className="h-8 w-8" />
                                            ) : (
                                              <CalendarClock className="h-8 w-8" />
                                            )}
                                          </div>
                                          <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-current/68">
                                            Quick Read
                                          </p>
                                          <p className="mt-2 text-[1.35rem] font-semibold leading-[1.2]">
                                            {tone === "completed"
                                              ? focusClass.recordingUrl
                                                ? "Recording route is ready."
                                                : "Course review is your best next step."
                                              : tone === "live"
                                                ? "The room can be opened from this card."
                                                : "You can return here when class begins."}
                                          </p>
                                          <p className="mt-3 text-[14px] leading-6 text-current/82">
                                            {tone === "completed"
                                              ? "Past sessions stay aligned with the same route and thread you used during class."
                                              : "This page keeps the same routing and scrolling flow while shifting the layout into the new student-dashboard style."}
                                          </p>
                                        </div>
                                      </FloatPulse>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </section>
                        </RevealSection>

                        <RevealSection delay={0.1}>
                          <section className="rounded-[24px] bg-white p-6 shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                              <div>
                                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-black/42">
                                  About This Class
                                </p>
                                <h2 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] text-black">
                                  Course context and next move.
                                </h2>
                                <p className="mt-3 text-[15px] leading-7 text-black/58">
                                  {focusClass.description?.trim() ||
                                    "This class opens from the student schedule, keeps the same route, and gives you direct access to the room, the messages, and the related course page."}
                                </p>

                                <div className="mt-5 flex flex-wrap items-center gap-3">
                                  <Link
                                    className={actionButtonStyles(
                                      "bg-[#38c1ff] text-white shadow-[0_10px_22px_rgba(56,193,255,0.22)] hover:-translate-y-0.5",
                                    )}
                                    href={courseHref}
                                  >
                                    <BookOpen className="h-4 w-4" />
                                    Open course page
                                  </Link>
                                  <Link
                                    className={actionButtonStyles(
                                      "border border-black/10 bg-white text-black hover:-translate-y-0.5",
                                    )}
                                    href={brandHref}
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                    Back to live classes
                                  </Link>
                                </div>
                              </div>

                              <div className="rounded-[22px] bg-[#f7f5f4] px-5 py-5">
                                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-black/42">
                                  What Happens Here
                                </p>
                                <div className="mt-4 space-y-3">
                                  {stateSteps.map((step) => (
                                    <div
                                      key={step}
                                      className="rounded-[18px] bg-white px-4 py-4 text-[14px] leading-7 text-black/68 shadow-[0_4px_10px_rgba(0,0,0,0.04)]"
                                    >
                                      {step}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </section>
                        </RevealSection>

                        <RevealSection delay={0.12}>
                          {focusClass && (
                            <ClassroomChat
                              classId={focusClass.id}
                              courseTitle={focusClass.courseTitle}
                              currentUserId={user?.id}
                              open={messagesOpen}
                              onToggleOpen={setMessagesOpen}
                            />
                          )}
                        </RevealSection>
                      </div>

                      <div className="space-y-6 xl:sticky xl:top-6">
                        <RevealSection delay={0.08}>
                          <aside className="rounded-[24px] bg-white px-5 py-6 shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-black/42">
                              Live Class Summary
                            </p>
                            <h2 className="mt-4 text-[1.35rem] font-semibold leading-[1.15] text-black">
                              {focusClass.title}
                            </h2>
                            <p className="mt-2 text-[14px] leading-7 text-black/56">
                              {focusClass.courseTitle}
                            </p>

                            <div className="mt-5 space-y-3">
                              <div className="rounded-[18px] bg-[#f7f5f4] px-4 py-4">
                                <div className="flex items-center gap-2 text-[13px] text-black/62">
                                  <CalendarClock className="h-4 w-4 text-black/42" />
                                  <span>{formatLongSessionDate(focusClass.startTime)}</span>
                                </div>
                              </div>
                              <div className="rounded-[18px] bg-[#f7f5f4] px-4 py-4">
                                <div className="flex items-center gap-2 text-[13px] text-black/62">
                                  <Clock3 className="h-4 w-4 text-black/42" />
                                  <span>{formatSessionTime(focusClass.startTime)}</span>
                                </div>
                              </div>
                              <div className="rounded-[18px] bg-[#f7f5f4] px-4 py-4">
                                <div className="flex items-center gap-2 text-[13px] text-black/62">
                                  <Video className="h-4 w-4 text-black/42" />
                                  <span>{focusClass.duration} min session</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 space-y-3">
                              {tone === "completed" ? (
                                <Link
                                  className={actionButtonStyles(
                                    "w-full bg-[#38c1ff] text-white shadow-[0_10px_22px_rgba(56,193,255,0.22)] hover:-translate-y-0.5",
                                  )}
                                  href={primaryHref}
                                  target={focusClass.recordingUrl ? "_blank" : undefined}
                                >
                                  <PlayCircle className="h-4 w-4" />
                                  {primaryLabel}
                                </Link>
                              ) : (
                                <button
                                  className={actionButtonStyles(
                                    "w-full bg-[#38c1ff] text-white shadow-[0_10px_22px_rgba(56,193,255,0.22)] hover:-translate-y-0.5",
                                  )}
                                  onClick={meetStarted ? endMeeting : startMeeting}
                                  type="button"
                                >
                                  {meetStarted ? (
                                    <PhoneOff className="h-4 w-4" />
                                  ) : (
                                    <LogIn className="h-4 w-4" />
                                  )}
                                  {primaryLabel}
                                </button>
                              )}

                              <Link
                                className={actionButtonStyles(
                                  "w-full border border-black/10 bg-white text-black hover:-translate-y-0.5",
                                )}
                                href={courseHref}
                              >
                                <BookOpen className="h-4 w-4" />
                                Open course
                              </Link>

                              {meetingIframeUrl && tone !== "completed" ? (
                                <a
                                  className={actionButtonStyles(
                                    "w-full border border-black/10 bg-white text-black hover:-translate-y-0.5",
                                  )}
                                  href={meetingIframeUrl}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Open in new tab
                                </a>
                              ) : null}
                            </div>
                          </aside>
                        </RevealSection>

                        <RevealSection delay={0.12}>
                          <div className="space-y-4">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-black/42">
                              Quick Routes
                            </p>

                            <RightRailLink
                              description="Return to the full live-class schedule and pick another session."
                              href={brandHref}
                              icon={Video}
                              title="Back to live classes"
                            />
                            <RightRailLink
                              description="Jump back into the broader student dashboard."
                              href="/dashboard"
                              icon={LayoutDashboard}
                              title="Open dashboard"
                            />
                            <RightRailLink
                              description="Move into the course flow connected to this class."
                              href={courseHref}
                              icon={BookOpen}
                              title="Open course"
                            />
                          </div>
                        </RevealSection>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
