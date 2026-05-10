"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
import { Badge } from "@/components/ui/badge";

import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
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
  toneMeta,
  sidebarItems,
  buildMeetingUrl,
  canEmbedMeetingUrl,
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

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

function subscribeToMobileViewport(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const media = window.matchMedia(MOBILE_MEDIA_QUERY);
  media.addEventListener("change", callback);

  return () => {
    media.removeEventListener("change", callback);
  };
}

function getMobileViewportSnapshot() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function getMobileViewportServerSnapshot() {
  return false;
}




function MetricCard({
  hint,
  icon: Icon,
  label,
  value,
}: {
  hint: string;
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <AnimCard>
      <article className="flex w-full min-w-0 items-center gap-3 rounded-[20px] bg-white p-3 shadow-sm ring-1 ring-black/5 sm:hidden">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#38c1ff]/10 text-[#38c1ff]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-black/42">{label}</p>
          <p className="truncate text-[14px] font-semibold text-black">{value}</p>
        </div>
      </article>

      <article className="hidden flex-col rounded-[24px] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.04)] ring-1 ring-black/5 transition-transform hover:-translate-y-1 sm:flex sm:p-6 sm:shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#38c1ff]/10 text-[#38c1ff]">
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-right text-[12px] font-semibold uppercase tracking-[0.14em] text-black/42">
            {label}
          </p>
        </div>
        <p className="mt-5 break-words text-[1.15rem] font-semibold leading-[1.25] text-black">{value}</p>
        <p className="mt-2 break-words text-[13px] leading-6 text-black/52">{hint}</p>
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
        className="flex min-w-0 items-start gap-3 rounded-[20px] bg-white px-4 py-4 shadow-[0_4px_10px_rgba(0,0,0,0.08)]"
        href={href}
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#38c1ff]/12 text-[#38c1ff]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[15px] font-semibold text-black">{title}</p>
          <p className="text-[13px] leading-6 text-black/54">{description}</p>
        </div>
      </Link>
    </AnimCard>
  );
}

function ExternalMeetingNotice({ href }: { href: string }) {
  return (
    <div className="rounded-[20px] bg-black/10 px-4 py-4 text-current">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-current/62">
        Meeting Access
      </p>
      <p className="mt-3 text-[14px] leading-6 text-current/86">
        This meeting provider opens in a separate tab on mobile because it blocks in-page classroom embeds.
      </p>
      <a
        className={actionButtonStyles("mt-4 w-full bg-white text-black shadow-[0_10px_22px_rgba(0,0,0,0.12)] hover:-translate-y-0.5")}
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        <ExternalLink className="h-4 w-4" />
        Open live room
      </a>
    </div>
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
  const isMobileViewport = useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    getMobileViewportServerSnapshot,
  );
  const [desktopMessagesOpen, setDesktopMessagesOpen] = useState(true);
  const [mobileMessagesOpen, setMobileMessagesOpen] = useState(false);
  const [meetStarted, setMeetStarted] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [attendanceTrackingStarted, setAttendanceTrackingStarted] = useState(false);

  const fetcher = (url: string) => apiClient.get<LiveClassData>(url);
  const { data, isLoading: loading } = useSWR(dataEndpoint, fetcher);

  const tone = getSessionTone(data ?? null);
  const focusClass = useMemo(() => {
    if (!data) return null;
    return data.live[0] ?? data.upcoming[0] ?? data.completed[0] ?? null;
  }, [data]);
  const meta = toneMeta[tone];
  const messagesOpen = isMobileViewport ? mobileMessagesOpen : desktopMessagesOpen;
  const handleMessagesOpenChange = useCallback(
    (open: boolean) => {
      if (isMobileViewport) {
        setMobileMessagesOpen(open);
        return;
      }
      setDesktopMessagesOpen(open);
    },
    [isMobileViewport],
  );

  useEffect(() => {
    setMeetStarted(false);
    setAttendanceMarked(false);
    setAttendanceTrackingStarted(false);
  }, [focusClass?.id]);

  const markAttendance = useCallback(
    async (status: "JOIN" | "LEAVE") => {
      if (!focusClass?.id) return;

      try {
        const response = await fetch(`/api/live-classes/${focusClass.id}/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          return;
        }

        if (status === "JOIN") {
          setAttendanceTrackingStarted(true);
          setAttendanceMarked(Boolean(payload.data?.isCounted));
          return;
        }

        setAttendanceTrackingStarted(false);
        setAttendanceMarked(Boolean(payload.data?.isCounted));
      } catch (error) {
        console.error("Failed to mark attendance", error);
      }
    },
    [focusClass?.id],
  );

  const meetingLaunchUrl = useMemo(() => {
    if (!focusClass?.id) return null;
    return buildMeetingUrl(focusClass.id, focusClass.meetingUrl, user?.name ?? undefined);
  }, [focusClass, user?.name]);
  const canEmbedMeeting = useMemo(
    () => canEmbedMeetingUrl(meetingLaunchUrl),
    [meetingLaunchUrl],
  );
  const requiresExternalMeetingWindow = Boolean(meetingLaunchUrl) && !canEmbedMeeting;

  const openMeetingInNewTab = useCallback(() => {
    if (!meetingLaunchUrl) return;

    const popup = window.open(meetingLaunchUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.assign(meetingLaunchUrl);
    }

    if (!attendanceMarked && !attendanceTrackingStarted) {
      void markAttendance("JOIN");
    }
  }, [attendanceMarked, attendanceTrackingStarted, markAttendance, meetingLaunchUrl]);

  const startMeeting = useCallback(() => {
    if (!focusClass?.id || !meetingLaunchUrl) return;

    if (requiresExternalMeetingWindow) {
      openMeetingInNewTab();
      return;
    }

    setMeetStarted(true);
    if (!attendanceMarked && !attendanceTrackingStarted) {
      void markAttendance("JOIN");
    }
  }, [
    attendanceMarked,
    attendanceTrackingStarted,
    focusClass?.id,
    markAttendance,
    meetingLaunchUrl,
    openMeetingInNewTab,
    requiresExternalMeetingWindow,
  ]);

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
    tone === "completed"
      ? meta.primaryLabel
      : requiresExternalMeetingWindow
        ? "Open Room"
        : tone === "live"
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
      <main className="min-h-screen overflow-x-hidden bg-[#f7f5f4] pb-28 sm:pb-0">


        <div className="mx-auto max-w-[1920px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-0 xl:py-8">
          <div className="grid gap-4 sm:gap-6 xl:grid-cols-[222px_minmax(0,1fr)] xl:items-start">
            <RevealSection className="hidden xl:block xl:pr-7">
              <aside className="sticky top-3 z-20 overflow-hidden rounded-r-[40px] bg-[linear-gradient(180deg,#ffbf00_0%,#ffd86a_100%)] px-4 py-12 shadow-[0_18px_48px_rgba(254,198,0,0.18)]">
                <nav className="scrollbar-none flex snap-x gap-2 overflow-x-auto pb-0.5 xl:flex-col xl:gap-1 xl:overflow-visible">
                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        className={cx(
                          "flex min-w-max snap-start items-center gap-2.5 rounded-[20px] bg-white/28 px-3 py-2.5 text-[13px] font-semibold text-black transition-colors duration-[var(--transition-fast)] xl:min-h-[56px] xl:gap-4 xl:rounded-[22px] xl:bg-transparent xl:px-5 xl:py-3 xl:text-[18px] xl:font-medium",
                          ("active" in item && item.active)
                            ? "bg-white/78 shadow-[0_10px_22px_rgba(0,0,0,0.08)] xl:bg-white/16 xl:shadow-none"
                            : "hover:bg-white/46 xl:hover:bg-white/20",
                        )}
                        href={item.href}
                      >
                        <Icon className="h-4.5 w-4.5 stroke-[2] xl:h-[22px] xl:w-[22px]" aria-hidden />
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
                  <div
                    className={cx(
                      "relative overflow-hidden rounded-[32px] px-5 py-7 shadow-[0_12px_40px_rgba(15,23,42,0.12)] sm:rounded-[24px] sm:px-8 sm:py-10 sm:shadow-[0_4px_10px_rgba(0,0,0,0.16)]",
                      meta.accentClass,
                    )}
                  >
                    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[45%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.28),transparent_68%)] sm:block" />
                    <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-center">
                      <div className="max-w-[42rem] space-y-5 sm:space-y-6">
                        <div>
                          <div className="mb-3 inline-flex rounded-full bg-black/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]">
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
                                Attendance counted
                              </span>
                            ) : attendanceTrackingStarted ? (
                              <span className="flex items-center gap-2 rounded-full bg-white/18 px-4 py-1.5 text-[13px] font-semibold text-white shadow-[0_2px_10px_rgba(255,255,255,0.08)]">
                                <CheckCircle2 className="h-4 w-4" />
                                Tracking attendance
                              </span>
                            ) : null}
                          </div>
                          <h1 className="max-w-[14ch] text-balance text-[2.25rem] font-bold leading-[1.05] tracking-[-0.04em] sm:max-w-[18ch] sm:text-[clamp(2rem,4vw,2.85rem)] sm:leading-[1.06] sm:tracking-[-0.04em]">
                            {focusClass?.title ?? meta.heroTitle}
                          </h1>
                          <p className="mt-3 max-w-[32rem] text-pretty text-[14px] leading-6 text-current/90 sm:max-w-[45rem] sm:text-[16px] sm:leading-7 sm:text-current/88">
                            {focusClass?.description?.trim() || meta.heroDescription}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
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

                        <div className="grid grid-cols-2 gap-2 rounded-[24px] bg-white/14 p-2 backdrop-blur-sm sm:grid-cols-2 sm:gap-3 sm:bg-transparent sm:p-0 sm:backdrop-blur-none md:flex md:flex-wrap">
                          {tone === "completed" ? (
                            <Link
                              className={actionButtonStyles(`col-span-2 justify-center py-3.5 sm:col-span-2 sm:w-auto sm:py-2.5 md:flex-1 ${meta.actionClass}`)}
                              href={primaryHref}
                              target={focusClass?.recordingUrl ? "_blank" : undefined}
                            >
                              <PlayCircle className="h-5 w-5 sm:h-4 sm:w-4" />
                              {primaryLabel}
                            </Link>
                          ) : (
                            <button
                              className={actionButtonStyles(`col-span-2 justify-center py-3.5 sm:col-span-2 sm:w-auto sm:py-2.5 md:flex-1 ${meta.actionClass}`)}
                              onClick={meetStarted ? endMeeting : startMeeting}
                              type="button"
                            >
                              {meetStarted ? (
                                <PhoneOff className="h-5 w-5 sm:h-4 sm:w-4" />
                              ) : (
                                <LogIn className="h-5 w-5 sm:h-4 sm:w-4" />
                              )}
                              {primaryLabel}
                            </button>
                          )}

                          <button
                            className={actionButtonStyles(`w-full justify-center px-4 py-3.5 sm:w-auto sm:px-4 sm:py-2.5 ${attendanceMarked ? "bg-[#f0fdf4] text-[#15803d]" : attendanceTrackingStarted ? "bg-white/18 text-white" : meta.secondaryActionClass}`)}
                            onClick={() => markAttendance("JOIN")}
                            disabled={attendanceMarked || attendanceTrackingStarted || tone !== "live"}
                            type="button"
                          >
                            <CheckCircle2 className="h-5 w-5 sm:h-4 sm:w-4" />
                            <span className="sm:hidden">
                              {attendanceMarked
                                ? "Marked"
                                : attendanceTrackingStarted
                                  ? "Tracking"
                                  : "Attendance"}
                            </span>
                            <span className="hidden sm:inline">
                              {attendanceMarked
                                ? "Attendance Counted"
                                : attendanceTrackingStarted
                                  ? "Tracking Attendance"
                                  : "Start Attendance"}
                            </span>
                          </button>

                          <Link
                            className={actionButtonStyles(`hidden sm:inline-flex sm:w-auto ${meta.secondaryActionClass}`)}
                            href={courseHref}
                          >
                            <BookOpen className="h-4 w-4" />
                            Open Course
                          </Link>

                          <button
                            className={actionButtonStyles(`w-full justify-center px-4 py-3.5 sm:w-auto sm:px-4 sm:py-2.5 ${meta.secondaryActionClass}`)}
                            onClick={() => handleMessagesOpenChange(!messagesOpen)}
                            type="button"
                          >
                            <MessageCircleMore className="h-5 w-5 sm:h-4 sm:w-4" />
                            <span className="sm:hidden">Thread</span>
                            <span className="hidden sm:inline">{messagesOpen ? "Hide Thread" : "Show Thread"}</span>
                          </button>
                        </div>
                      </div>

                      <FloatPulse className="mx-auto w-full xl:mx-0 xl:max-w-[300px] xl:justify-self-end">
                        <div className="rounded-[24px] bg-white/16 p-4 backdrop-blur-md sm:rounded-[28px] sm:p-5">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-current/72">
                            {meta.railLabel}
                          </p>
                          <p className="mt-3 text-[1.5rem] font-semibold tracking-[-0.04em] sm:mt-4 sm:text-[2rem]">
                            {focusClass ? meta.railValue : "Unavailable"}
                          </p>
                          <div className="mt-4 grid gap-2 sm:mt-5 sm:space-y-3">
                            <div className="rounded-[18px] bg-black/10 px-4 py-3.5 sm:py-4">
                              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-current/62">
                                Session Date
                              </p>
                              <p className="mt-2 text-[15px] font-semibold">
                                {focusClass
                                  ? formatShortDate(focusClass.startTime)
                                  : "Pending"}
                              </p>
                            </div>
                            <div className="rounded-[18px] bg-black/10 px-4 py-3.5 sm:py-4">
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
                            <div className="rounded-[18px] bg-black/10 px-4 py-3.5 sm:py-4">
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
                      <StaggerGrid className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
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
                          <section className="overflow-hidden rounded-[28px] bg-white px-5 py-6 shadow-sm sm:rounded-[24px] sm:p-6 sm:shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
                            <div className="flex flex-col gap-3 border-b border-black/6 pb-5 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-black/42">
                                  Classroom Stage
                                </p>
                                <h2 className="mt-2 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-black sm:text-[1.65rem] sm:tracking-[-0.04em]">
                                  Stay inside the class without leaving the student flow.
                                </h2>
                              </div>
                              <Badge tone={meta.badgeTone}>{meta.badgeLabel}</Badge>
                            </div>

                            <div className="mt-6">
                              <AnimatePresence mode="wait">
                                {meetStarted && meetingLaunchUrl && canEmbedMeeting && tone !== "completed" ? (
                                  <VideoConference
                                    meetingIframeUrl={meetingLaunchUrl}
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
                                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
                                      <div className="space-y-5">
                                        <div className="inline-flex rounded-full bg-black/12 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.16em]">
                                          {meta.heroEyebrow}
                                        </div>
                                        <div>
                                          <h3 className="text-[1.85rem] font-semibold leading-[1.12] tracking-[-0.04em]">
                                            {requiresExternalMeetingWindow
                                              ? "This classroom opens in a separate tab."
                                              : tone === "live"
                                              ? "Open the live room the moment you are ready."
                                              : tone === "completed"
                                                ? "Everything from this class now lives in review mode."
                                                : "This classroom is staged for the upcoming session."}
                                          </h3>
                                          <p className="mt-3 max-w-[42rem] text-[15px] leading-7 text-current/86">
                                            {requiresExternalMeetingWindow
                                              ? "The meeting provider for this class blocks embedded classrooms, so we launch the room in a new tab to avoid blank iframes and mobile console errors."
                                              : tone === "live"
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

                                        {requiresExternalMeetingWindow && meetingLaunchUrl ? (
                                          <ExternalMeetingNotice href={meetingLaunchUrl} />
                                        ) : null}
                                      </div>

                                      <FloatPulse className="mx-auto w-full lg:max-w-[260px]">
                                        <div className="rounded-[24px] bg-white/14 p-4 backdrop-blur sm:p-5">
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
                                              : requiresExternalMeetingWindow
                                                ? "Use the provider tab to join this session."
                                              : tone === "live"
                                                ? "The room can be opened from this card."
                                                : "You can return here when class begins."}
                                          </p>
                                          <p className="mt-3 text-[14px] leading-6 text-current/82">
                                            {tone === "completed"
                                              ? "Past sessions stay aligned with the same route and thread you used during class."
                                              : requiresExternalMeetingWindow
                                                ? "We only embed meeting providers that allow iframe classrooms. This one opens externally for a cleaner mobile experience."
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
                          <section className="overflow-hidden rounded-[28px] bg-white px-5 py-6 shadow-sm sm:rounded-[24px] sm:p-6 sm:shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                              <div>
                                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-black/42">
                                  About This Class
                                </p>
                                <h2 className="mt-2 text-balance text-[1.45rem] font-semibold tracking-[-0.04em] text-black sm:text-[1.55rem]">
                                  Course context and next move.
                                </h2>
                                <p className="mt-3 text-[15px] leading-7 text-black/58">
                                  {focusClass.description?.trim() ||
                                    "This class opens from the student schedule, keeps the same route, and gives you direct access to the room, the messages, and the related course page."}
                                </p>

                                <div className="mt-5 flex flex-wrap items-center gap-3">
                                  <Link
                                    className={actionButtonStyles(
                                      "w-full justify-center bg-[#38c1ff] text-white shadow-[0_10px_22px_rgba(56,193,255,0.22)] hover:-translate-y-0.5 sm:w-auto",
                                    )}
                                    href={courseHref}
                                  >
                                    <BookOpen className="h-4 w-4" />
                                    Open course page
                                  </Link>
                                  <Link
                                    className={actionButtonStyles(
                                      "w-full justify-center border border-black/10 bg-white text-black hover:-translate-y-0.5 sm:w-auto",
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
                              onToggleOpen={handleMessagesOpenChange}
                            />
                          )}
                        </RevealSection>
                      </div>

                      <div className="space-y-4 sm:space-y-6 xl:sticky xl:top-6">
                        <RevealSection delay={0.08}>
                          <aside className="overflow-hidden rounded-[28px] bg-white px-5 py-6 shadow-sm sm:rounded-[24px] sm:p-6 sm:shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
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

                            <div className="hidden sm:block sm:mt-5 sm:space-y-3">
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

                            </div>
                          </aside>
                        </RevealSection>

                        <RevealSection className="hidden xl:block" delay={0.12}>
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
