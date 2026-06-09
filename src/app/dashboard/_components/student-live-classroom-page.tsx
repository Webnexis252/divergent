"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
  ShieldCheck,
  Timer,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { cx } from "@/lib/cx";
import { formatRelativeTime, formatShortDate } from "@/lib/date-format";
import type { LiveClassData } from "@/lib/live-class-types";
import { AnimCard, PageTransition, RevealSection, StaggerGrid } from "./motion-wrappers";
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

// ─── Attendance constants ─────────────────────────────────────────────────────
const ATTENDANCE_REQUIRED_SECS = 30 * 60; // 30 minutes
const ATTENDANCE_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // update every 5 min

// ─── Mobile viewport hook ─────────────────────────────────────────────────────
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

function subscribeToMobileViewport(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia(MOBILE_MEDIA_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function getMobileViewportSnapshot() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}
function getMobileViewportServerSnapshot() { return false; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── AttendanceTracker ────────────────────────────────────────────────────────
function AttendanceTracker({
  accumulatedSecs,
  sessionElapsedSecs,
  isCounted,
  isTracking,
  tone,
}: {
  accumulatedSecs: number;
  sessionElapsedSecs: number;
  isCounted: boolean;
  isTracking: boolean;
  tone: "live" | "upcoming" | "completed" | "empty";
}) {
  const totalSecs = accumulatedSecs + (isTracking ? sessionElapsedSecs : 0);
  const progress = Math.min(100, (totalSecs / ATTENDANCE_REQUIRED_SECS) * 100);
  const remainingSecs = Math.max(0, ATTENDANCE_REQUIRED_SECS - totalSecs);

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_4px_20px_rgba(15,23,42,0.07)]">
      <div className="px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={cx(
                "grid h-9 w-9 place-items-center rounded-xl",
                isCounted ? "bg-emerald-50 text-emerald-600" : "bg-[#38c1ff]/10 text-[#38c1ff]",
              )}
            >
              {isCounted ? <ShieldCheck className="h-5 w-5" /> : <Timer className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Attendance</p>
              <p className="text-[13px] font-semibold text-gray-900">
                {isCounted ? "Counted ✓" : isTracking ? "Tracking live…" : "Not started"}
              </p>
            </div>
          </div>
          {isTracking && (
            <div className="rounded-xl bg-[#38c1ff]/10 px-3 py-1.5 text-center">
              <p className="font-mono text-[1rem] font-bold text-[#38c1ff]">{formatDuration(sessionElapsedSecs)}</p>
              <p className="text-[10px] text-[#38c1ff]/70">this session</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5">
            <span>{formatDuration(Math.min(totalSecs, ATTENDANCE_REQUIRED_SECS))} in class</span>
            <span>{isCounted ? "30:00 ✓" : `${formatDuration(remainingSecs)} left`}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <motion.div
              className={cx(
                "h-full rounded-full",
                isCounted
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  : progress > 60
                    ? "bg-gradient-to-r from-[#38c1ff] to-emerald-400"
                    : "bg-gradient-to-r from-[#38c1ff] to-[#22b5f7]",
              )}
              animate={{ width: `${progress}%` }}
              initial={{ width: "0%" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            {isCounted
              ? "Your attendance for this session has been recorded."
              : tone === "live"
                ? "Stay in class for 30 continuous minutes to have attendance counted."
                : "Attendance is tracked only during live sessions."}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────
function SummaryCard({
  focusClass,
  tone,
  primaryHref,
  primaryLabel,
  courseHref,
  meetStarted,
  startMeeting,
  endMeeting,
}: {
  focusClass: NonNullable<ReturnType<typeof useMemo<ReturnType<typeof getSessionTone>>>>;
  tone: ReturnType<typeof getSessionTone>;
  primaryHref: string;
  primaryLabel: string;
  courseHref: string;
  meetStarted: boolean;
  startMeeting: () => void;
  endMeeting: () => void;
}) {
  return null; // handled inline
}

// ─── RightRailLink ────────────────────────────────────────────────────────────
function RightRailLink({ description, href, icon: Icon, title }: { description: string; href: string; icon: LucideIcon; title: string }) {
  return (
    <AnimCard>
      <Link
        href={href}
        className="flex items-start gap-3 rounded-xl bg-white px-4 py-3.5 ring-1 ring-black/5 shadow-[0_2px_10px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)]"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#38c1ff]/10 text-[#38c1ff]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-gray-900">{title}</p>
          <p className="text-[12px] leading-relaxed text-gray-500">{description}</p>
        </div>
      </Link>
    </AnimCard>
  );
}

// ─── ExternalMeetingNotice ────────────────────────────────────────────────────
function ExternalMeetingNotice({ href }: { href: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/20">
      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/60">External Meeting</p>
      <p className="mt-2 text-[14px] leading-6 text-white/80">
        This meeting provider opens in a separate tab — it cannot be embedded directly in the classroom.
      </p>
      <a
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[14px] font-semibold text-gray-900 shadow-md transition hover:-translate-y-0.5"
      >
        <ExternalLink className="h-4 w-4" />
        Open live room
      </a>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function StudentLiveClassroomPage({ brandHref, dataEndpoint }: { brandHref: string; dataEndpoint: string }) {
  const { user } = useAuth();
  const isMobileViewport = useSyncExternalStore(subscribeToMobileViewport, getMobileViewportSnapshot, getMobileViewportServerSnapshot);
  const [desktopMessagesOpen, setDesktopMessagesOpen] = useState(true);
  const [mobileMessagesOpen, setMobileMessagesOpen] = useState(false);
  const [meetStarted, setMeetStarted] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [attendanceTrackingStarted, setAttendanceTrackingStarted] = useState(false);

  // ── Attendance timer state ───────────────────────────────────────────────
  const [accumulatedWatchSecs, setAccumulatedWatchSecs] = useState(0);
  const [sessionElapsedSecs, setSessionElapsedSecs] = useState(0);
  const sessionStartTimestampRef = useRef<number | null>(null);

  const fetcher = (url: string) => apiClient.get<LiveClassData>(url);
  const { data, isLoading: loading } = useSWR(dataEndpoint, fetcher);

  const tone = getSessionTone(data ?? null);
  const focusClass = useMemo(() => {
    if (!data) return null;
    return data.live[0] ?? data.upcoming[0] ?? data.completed[0] ?? null;
  }, [data]);
  const meta = toneMeta[tone];
  const messagesOpen = isMobileViewport ? mobileMessagesOpen : desktopMessagesOpen;

  const handleMessagesOpenChange = useCallback((open: boolean) => {
    if (isMobileViewport) { setMobileMessagesOpen(open); return; }
    setDesktopMessagesOpen(open);
  }, [isMobileViewport]);

  // Reset when class changes
  useEffect(() => {
    setMeetStarted(false);
    setAttendanceMarked(false);
    setAttendanceTrackingStarted(false);
    setAccumulatedWatchSecs(0);
    setSessionElapsedSecs(0);
    sessionStartTimestampRef.current = null;
  }, [focusClass?.id]);

  // ── Local session timer (ticks every second while meeting is active) ─────
  useEffect(() => {
    if (!meetStarted || !attendanceTrackingStarted) {
      setSessionElapsedSecs(0);
      sessionStartTimestampRef.current = null;
      return;
    }

    if (!sessionStartTimestampRef.current) {
      sessionStartTimestampRef.current = Date.now();
    }

    const tick = setInterval(() => {
      if (sessionStartTimestampRef.current) {
        setSessionElapsedSecs(Math.floor((Date.now() - sessionStartTimestampRef.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [meetStarted, attendanceTrackingStarted]);

  const markAttendance = useCallback(async (status: "JOIN" | "LEAVE" | "UPDATE") => {
    if (!focusClass?.id) return;
    try {
      const response = await fetch(`/api/live-classes/${focusClass.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) return;

      if (status === "JOIN") {
        setAttendanceTrackingStarted(true);
        setAttendanceMarked(Boolean(payload.data?.isCounted));
        // Restore previously accumulated watch time
        const dbWatchSecs = payload.data?.watchTimeSecs ?? 0;
        setAccumulatedWatchSecs(dbWatchSecs);
        // Reset local session timer
        sessionStartTimestampRef.current = Date.now();
        setSessionElapsedSecs(0);
        return;
      }

      if (status === "UPDATE") {
        // Server has now added the delta — sync accumulated time
        const dbWatchSecs = payload.data?.watchTimeSecs ?? 0;
        setAccumulatedWatchSecs(dbWatchSecs);
        setAttendanceMarked(Boolean(payload.data?.isCounted));
        // Reset local session timer from now
        sessionStartTimestampRef.current = Date.now();
        setSessionElapsedSecs(0);
        return;
      }

      // LEAVE
      setAttendanceTrackingStarted(false);
      setAccumulatedWatchSecs(payload.data?.watchTimeSecs ?? 0);
      setAttendanceMarked(Boolean(payload.data?.isCounted));
    } catch (error) {
      console.error("Failed to mark attendance", error);
    }
  }, [focusClass]);

  // ── Periodic UPDATE every 5 minutes while in session ────────────────────
  useEffect(() => {
    if (!meetStarted || !attendanceTrackingStarted || !focusClass?.id) return;
    const interval = setInterval(() => {
      void markAttendance("UPDATE");
    }, ATTENDANCE_UPDATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [meetStarted, attendanceTrackingStarted, focusClass?.id, markAttendance]);

  // Meeting URL
  const meetingLaunchUrl = useMemo(() => {
    if (!focusClass?.id) return null;
    return buildMeetingUrl(focusClass.id, focusClass.meetingUrl, user?.name ?? undefined);
  }, [focusClass, user?.name]);
  const canEmbedMeeting = useMemo(() => canEmbedMeetingUrl(meetingLaunchUrl), [meetingLaunchUrl]);
  const requiresExternalMeetingWindow = Boolean(meetingLaunchUrl) && !canEmbedMeeting;

  const openMeetingInNewTab = useCallback(() => {
    if (!meetingLaunchUrl) return;
    const popup = window.open(meetingLaunchUrl, "_blank", "noopener,noreferrer");
    if (!popup) window.location.assign(meetingLaunchUrl);
    if (!attendanceTrackingStarted) void markAttendance("JOIN");
  }, [attendanceTrackingStarted, markAttendance, meetingLaunchUrl]);

  const startMeeting = useCallback(() => {
    if (!focusClass?.id || !meetingLaunchUrl) return;
    if (requiresExternalMeetingWindow) { openMeetingInNewTab(); return; }
    setMeetStarted(true);
    if (!attendanceTrackingStarted) void markAttendance("JOIN");
  }, [attendanceTrackingStarted, focusClass?.id, markAttendance, meetingLaunchUrl, openMeetingInNewTab, requiresExternalMeetingWindow]);

  const endMeeting = useCallback(() => {
    setMeetStarted(false);
    void markAttendance("LEAVE");
  }, [markAttendance]);

  // Send LEAVE on page unload
  useEffect(() => {
    const handleUnload = () => {
      if (meetStarted && focusClass?.id) {
        fetch(`/api/live-classes/${focusClass.id}/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "LEAVE" }),
          keepalive: true,
        }).catch(console.error);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [meetStarted, focusClass?.id]);

  const courseHref = focusClass ? `/dashboard/courses/${focusClass.courseSlug}` : "/dashboard/courses";
  const primaryHref = tone === "completed" && focusClass ? `/dashboard/live-classes/${focusClass.id}/recording` : courseHref;
  const stateSteps = getStateSteps(tone, focusClass, attendanceMarked);
  const highlights = focusClass && tone !== "empty" ? getToneHighlights(focusClass, tone, attendanceMarked) : [];
  const primaryLabel = tone === "completed"
    ? meta.primaryLabel
    : requiresExternalMeetingWindow
      ? "Open Room"
      : tone === "live"
        ? meetStarted ? "End Session" : "Join Class"
        : tone === "upcoming"
          ? meetStarted ? "Leave Room" : "Enter Class"
          : meta.primaryLabel;

  return (
    <PageTransition>
      <main className="min-h-screen bg-[#f5f6fa] pb-28 sm:pb-0">
        <div className="mx-auto max-w-[1920px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 xl:px-0 xl:py-8">
          <div className="grid gap-4 sm:gap-6 xl:grid-cols-[222px_minmax(0,1fr)] xl:items-start">

            {/* ── Sidebar nav ── */}
            <RevealSection className="hidden xl:block xl:pr-7">
              <aside className="sticky top-3 z-20 overflow-hidden rounded-r-[40px] bg-[linear-gradient(180deg,#ffbf00_0%,#ffd86a_100%)] px-4 py-12 shadow-[0_18px_48px_rgba(254,198,0,0.18)]">
                <nav className="scrollbar-none flex snap-x gap-2 overflow-x-auto pb-0.5 xl:flex-col xl:gap-1 xl:overflow-visible">
                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cx(
                          "flex min-w-max snap-start items-center gap-2.5 rounded-[20px] bg-white/28 px-3 py-2.5 text-[13px] font-semibold text-black transition-colors duration-150 xl:min-h-[56px] xl:gap-4 xl:rounded-[22px] xl:bg-transparent xl:px-5 xl:py-3 xl:text-[18px] xl:font-medium",
                          ("active" in item && item.active)
                            ? "bg-white/78 shadow-[0_10px_22px_rgba(0,0,0,0.08)] xl:bg-white/16 xl:shadow-none"
                            : "hover:bg-white/46 xl:hover:bg-white/20",
                        )}
                      >
                        <Icon className="h-4.5 w-4.5 stroke-[2] xl:h-[22px] xl:w-[22px]" aria-hidden />
                        <span className="whitespace-nowrap">{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </aside>
            </RevealSection>

            {/* ── Main content ── */}
            <section className="min-w-0 xl:pr-10">
              <div className="mx-auto max-w-[1160px] space-y-6 sm:space-y-8">

                {/* ── Hero banner ── */}
                <RevealSection>
                  <div
                    className={cx(
                      "relative overflow-hidden rounded-2xl px-6 py-8 shadow-[0_16px_48px_rgba(15,23,42,0.2)] sm:rounded-3xl sm:px-10 sm:py-10",
                      meta.accentClass,
                    )}
                  >
                    {/* Ambient decoration */}
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,193,255,0.15),transparent_55%)]" />
                    <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

                    <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-center">
                      {/* Left: class info */}
                      <div className="space-y-5">
                        <div>
                          <div className="mb-3 inline-flex rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
                            {meta.heroEyebrow}
                          </div>
                          <div className="mb-3 flex flex-wrap items-center gap-2.5">
                            <Badge tone={meta.badgeTone}>{meta.badgeLabel}</Badge>
                            {tone === "live" && (
                              <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-[12px] font-bold text-red-300 ring-1 ring-red-400/30">
                                <span className="relative flex h-2 w-2">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
                                </span>
                                Room Open
                              </span>
                            )}
                            {attendanceMarked && (
                              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[12px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Attendance Counted
                              </span>
                            )}
                          </div>
                          <h1 className="text-[1.9rem] font-extrabold leading-tight tracking-tight sm:text-[2.4rem]">
                            {focusClass?.title ?? meta.heroTitle}
                          </h1>
                          <p className="mt-3 max-w-[36rem] text-[14px] leading-relaxed text-white/65 sm:text-[15px]">
                            {focusClass?.description?.trim() || meta.heroDescription}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {focusClass && (
                            <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-medium backdrop-blur">
                              {formatLongSessionDate(focusClass.startTime)}
                            </span>
                          )}
                          {focusClass && (
                            <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-medium backdrop-blur">
                              {formatSessionWindow(focusClass.startTime, focusClass.duration)}
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          {tone === "completed" ? (
                            <Link
                              href={primaryHref}
                              target={focusClass?.recordingUrl ? "_blank" : undefined}
                              className={actionButtonStyles(`${meta.actionClass}`)}
                            >
                              <PlayCircle className="h-4.5 w-4.5" />
                              {primaryLabel}
                            </Link>
                          ) : (
                            <button
                              onClick={meetStarted ? endMeeting : startMeeting}
                              type="button"
                              className={actionButtonStyles(`${meta.actionClass}`)}
                            >
                              {meetStarted ? <PhoneOff className="h-4.5 w-4.5" /> : <LogIn className="h-4.5 w-4.5" />}
                              {primaryLabel}
                            </button>
                          )}
                          <Link
                            href={courseHref}
                            className={actionButtonStyles(meta.secondaryActionClass)}
                          >
                            <BookOpen className="h-4 w-4" />
                            Open Course
                          </Link>
                          <button
                            onClick={() => handleMessagesOpenChange(!messagesOpen)}
                            type="button"
                            className={actionButtonStyles(meta.secondaryActionClass)}
                          >
                            <MessageCircleMore className="h-4 w-4" />
                            {messagesOpen ? "Hide Chat" : "Show Chat"}
                          </button>
                        </div>
                      </div>

                      {/* Right: class summary chip */}
                      <div className="hidden xl:block">
                        <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur-sm">
                          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">
                            {meta.railLabel}
                          </p>
                          <p className="mt-2 text-[1.45rem] font-bold">{focusClass ? meta.railValue : "Unavailable"}</p>
                          <div className="mt-4 space-y-2">
                            {focusClass && (
                              <>
                                <div className="flex items-center gap-2.5 rounded-xl bg-black/15 px-4 py-3 text-[13px]">
                                  <CalendarClock className="h-4 w-4 text-white/50 shrink-0" />
                                  <span className="text-white/80">{formatShortDate(focusClass.startTime)}</span>
                                </div>
                                <div className="flex items-center gap-2.5 rounded-xl bg-black/15 px-4 py-3 text-[13px]">
                                  <Clock3 className="h-4 w-4 text-white/50 shrink-0" />
                                  <span className="text-white/80">{formatSessionTime(focusClass.startTime)}</span>
                                </div>
                                <div className="flex items-center gap-2.5 rounded-xl bg-black/15 px-4 py-3 text-[13px]">
                                  <Video className="h-4 w-4 text-white/50 shrink-0" />
                                  <span className="text-white/80">{focusClass.duration} min session</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </RevealSection>

                {/* ── Body ── */}
                {loading ? (
                  <RevealSection delay={0.04}>
                    <div className="flex min-h-[12rem] items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm ring-1 ring-black/5">
                      <div className="flex items-center gap-3">
                        <Spinner className="h-5 w-5 border-[#38c1ff] text-[#38c1ff]" />
                        Loading classroom...
                      </div>
                    </div>
                  </RevealSection>
                ) : !focusClass ? (
                  <RevealSection delay={0.06}>
                    <EmptyState
                      description="We could not load this class. Refresh and try again."
                      icon={<CalendarClock className="h-6 w-6" />}
                      title="Class unavailable"
                    />
                  </RevealSection>
                ) : (
                  <>
                    {/* ── Metric chips row (mobile summary) ── */}
                    <RevealSection delay={0.04} className="xl:hidden">
                      <StaggerGrid className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          { icon: CalendarClock, label: "Date", value: formatShortDate(focusClass.startTime) },
                          { icon: Clock3, label: "Time", value: formatSessionTime(focusClass.startTime) },
                          { icon: Video, label: "Duration", value: `${focusClass.duration} min` },
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-black/5 shadow-sm">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#38c1ff]/10 text-[#38c1ff]">
                              <Icon className="h-4.5 w-4.5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                              <p className="text-[13px] font-semibold text-gray-900">{value}</p>
                            </div>
                          </div>
                        ))}
                      </StaggerGrid>
                    </RevealSection>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
                      {/* ── Left column ── */}
                      <div className="space-y-6">

                        {/* Classroom Stage */}
                        <RevealSection delay={0.06}>
                          <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
                            <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Classroom Stage</p>
                                <h2 className="mt-1 text-[1.25rem] font-bold text-gray-900">
                                  {meetStarted ? "Session in progress" : tone === "live" ? "Ready to join" : tone === "upcoming" ? "Waiting for class" : "Session ended"}
                                </h2>
                              </div>
                              <Badge tone={meta.badgeTone}>{meta.badgeLabel}</Badge>
                            </div>

                            <div className="p-6">
                              <AnimatePresence mode="wait">
                                {meetStarted && meetingLaunchUrl && canEmbedMeeting && tone !== "completed" ? (
                                  <VideoConference meetingIframeUrl={meetingLaunchUrl} onEndMeeting={endMeeting} />
                                ) : (
                                  <motion.div
                                    key={tone}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 12 }}
                                    initial={{ opacity: 0, y: 12 }}
                                    transition={{ duration: 0.25 }}
                                    className={cx(
                                      "overflow-hidden rounded-2xl p-6",
                                      meta.stageClass,
                                    )}
                                  >
                                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
                                      <div className="space-y-5">
                                        <div className="inline-flex rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">
                                          {meta.heroEyebrow}
                                        </div>
                                        <h3 className="text-[1.55rem] font-bold leading-tight">
                                          {requiresExternalMeetingWindow
                                            ? "This classroom opens in a separate tab."
                                            : tone === "live"
                                              ? "Ready when you are. Click Join Class to enter."
                                              : tone === "completed"
                                                ? "This session is complete."
                                                : "The room will open when class begins."}
                                        </h3>
                                        <p className="max-w-[38rem] text-[14px] leading-7 text-white/75">
                                          {requiresExternalMeetingWindow
                                            ? "The meeting provider cannot be embedded — we'll open it in a new tab for the best experience."
                                            : tone === "live"
                                              ? "Join the stream right here, track your attendance, and use the class chat without leaving."
                                              : tone === "completed"
                                                ? "Review any notes, watch the recording if available, and return to the course for the next lesson."
                                                : "Bookmark this page and return when class starts — everything will be here."}
                                        </p>

                                        {/* Highlights */}
                                        <div className="grid gap-3 sm:grid-cols-3">
                                          {highlights.map((h) => (
                                            <div key={h.label} className="rounded-xl bg-white/10 px-4 py-3.5 ring-1 ring-white/10">
                                              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">{h.label}</p>
                                              <p className="mt-2 text-[14px] font-semibold leading-5">{h.value}</p>
                                            </div>
                                          ))}
                                        </div>

                                        {requiresExternalMeetingWindow && meetingLaunchUrl && (
                                          <ExternalMeetingNotice href={meetingLaunchUrl} />
                                        )}
                                      </div>

                                      {/* Info card */}
                                      <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15">
                                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
                                          {tone === "completed" ? (
                                            <PlayCircle className="h-7 w-7" />
                                          ) : tone === "live" ? (
                                            <Radio className="h-7 w-7" />
                                          ) : (
                                            <CalendarClock className="h-7 w-7" />
                                          )}
                                        </div>
                                        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">
                                          Quick info
                                        </p>
                                        <p className="mt-2 text-[1.15rem] font-bold leading-tight">
                                          {tone === "live"
                                            ? "Attendance tracked automatically"
                                            : tone === "completed"
                                              ? "Session recording available"
                                              : "Check the start time above"}
                                        </p>
                                        <p className="mt-2.5 text-[13px] leading-6 text-white/70">
                                          {tone === "live"
                                            ? "Stay for 30+ minutes and your attendance will be counted automatically."
                                            : tone === "completed"
                                              ? "Past sessions remain accessible — use the recording or the course page."
                                              : "Arrive a minute early so you're ready the moment the room opens."}
                                        </p>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </section>
                        </RevealSection>

                        {/* About this class */}
                        <RevealSection delay={0.08}>
                          <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
                            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
                              <div className="border-b border-gray-100 px-6 py-6 lg:border-b-0 lg:border-r">
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">About This Class</p>
                                <h2 className="mt-2 text-[1.3rem] font-bold tracking-tight text-gray-900">
                                  {focusClass.title}
                                </h2>
                                <p className="mt-1 text-[13px] text-gray-500">{focusClass.courseTitle}</p>
                                <p className="mt-3 text-[14px] leading-7 text-gray-600">
                                  {focusClass.description?.trim() || "This class is part of your enrolled course. Join when the room opens and stay for 30+ minutes to have your attendance recorded."}
                                </p>
                                <div className="mt-5 flex flex-wrap gap-3">
                                  <Link
                                    href={courseHref}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[#38c1ff] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(56,193,255,0.3)] transition hover:-translate-y-0.5"
                                  >
                                    <BookOpen className="h-4 w-4" />
                                    Open Course Page
                                  </Link>
                                  <Link
                                    href={brandHref}
                                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:bg-gray-50"
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                    Back to Live Classes
                                  </Link>
                                </div>
                              </div>
                              <div className="px-6 py-6">
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">What Happens Here</p>
                                <div className="mt-4 space-y-2.5">
                                  {stateSteps.map((step) => (
                                    <div key={step} className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3.5">
                                      <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#38c1ff]" />
                                      <p className="text-[13px] leading-6 text-gray-600">{step}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </section>
                        </RevealSection>

                        {/* Class Chat */}
                        <RevealSection delay={0.1}>
                          <ClassroomChat
                            classId={focusClass.id}
                            courseTitle={focusClass.courseTitle}
                            currentUserId={user?.id}
                            open={messagesOpen}
                            onToggleOpen={handleMessagesOpenChange}
                          />
                        </RevealSection>
                      </div>

                      {/* ── Right sidebar ── */}
                      <div className="space-y-4 xl:sticky xl:top-6">

                        {/* Live Class Summary */}
                        <RevealSection delay={0.06}>
                          <aside className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_4px_20px_rgba(15,23,42,0.07)]">
                            <div className="border-b border-gray-100 px-5 py-4">
                              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Live Class Summary</p>
                            </div>
                            <div className="space-y-3 p-5">
                              <h2 className="text-[1.15rem] font-bold text-gray-900">{focusClass.title}</h2>
                              <p className="text-[13px] text-gray-500">{focusClass.courseTitle}</p>
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-4 py-2.5 text-[13px] text-gray-600">
                                  <CalendarClock className="h-4 w-4 text-gray-400 shrink-0" />
                                  {formatLongSessionDate(focusClass.startTime)}
                                </div>
                                <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-4 py-2.5 text-[13px] text-gray-600">
                                  <Clock3 className="h-4 w-4 text-gray-400 shrink-0" />
                                  {formatSessionTime(focusClass.startTime)}
                                </div>
                                <div className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-4 py-2.5 text-[13px] text-gray-600">
                                  <Video className="h-4 w-4 text-gray-400 shrink-0" />
                                  {focusClass.duration} min session
                                </div>
                              </div>

                              {/* Primary CTA */}
                              <div className="pt-1 space-y-2">
                                {tone === "completed" ? (
                                  <Link
                                    href={primaryHref}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#38c1ff] py-2.5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(56,193,255,0.3)] transition hover:-translate-y-0.5"
                                  >
                                    <PlayCircle className="h-4 w-4" />
                                    {primaryLabel}
                                  </Link>
                                ) : (
                                  <button
                                    onClick={meetStarted ? endMeeting : startMeeting}
                                    type="button"
                                    className={cx(
                                      "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-semibold transition hover:-translate-y-0.5",
                                      meetStarted
                                        ? "bg-gray-800 text-white shadow-sm"
                                        : "bg-[#38c1ff] text-white shadow-[0_4px_14px_rgba(56,193,255,0.3)]",
                                    )}
                                  >
                                    {meetStarted ? <PhoneOff className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                                    {primaryLabel}
                                  </button>
                                )}
                                <Link
                                  href={courseHref}
                                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-[14px] font-semibold text-gray-700 transition hover:-translate-y-0.5 hover:bg-gray-50"
                                >
                                  <BookOpen className="h-4 w-4" />
                                  Open Course
                                </Link>
                              </div>
                            </div>
                          </aside>
                        </RevealSection>

                        {/* Attendance tracker */}
                        {tone === "live" && (
                          <RevealSection delay={0.08}>
                            <AttendanceTracker
                              accumulatedSecs={accumulatedWatchSecs}
                              sessionElapsedSecs={sessionElapsedSecs}
                              isCounted={attendanceMarked}
                              isTracking={attendanceTrackingStarted}
                              tone={tone}
                            />
                          </RevealSection>
                        )}

                        {/* Quick Routes */}
                        <RevealSection delay={0.1}>
                          <div className="space-y-3">
                            <p className="px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
                              Quick Routes
                            </p>
                            <RightRailLink description="Return to the full live-class schedule." href={brandHref} icon={Video} title="Back to live classes" />
                            <RightRailLink description="Jump back into the student dashboard." href="/dashboard" icon={LayoutDashboard} title="Open dashboard" />
                            <RightRailLink description="Continue with this course's material." href={courseHref} icon={BookOpen} title="Open course" />
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
