"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarClock,
  CheckCircle2,
  ImagePlus,
  LogIn,
  MessageCircleMore,
  PhoneOff,
  PlayCircle,
  Radio,
  SendHorizontal,
  Video,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Surface } from "@/components/ui/surface";
import { useAuth } from "@/context/auth-context";
import type {
  LiveClassData,
  LiveClassMessage,
} from "@/lib/live-class-types";
import { PageTransition, RevealSection } from "./motion-wrappers";

type SessionTone = "live" | "upcoming" | "completed" | "empty";

const toneMeta = {
  completed: {
    accent: "var(--warning)",
    badgeTone: "warning" as const,
    ctaLabel: "Open recording",
    headline: "Latest recorded session",
  },
  empty: {
    accent: "var(--text-subtle)",
    badgeTone: "neutral" as const,
    ctaLabel: "Browse courses",
    headline: "No session selected",
  },
  live: {
    accent: "var(--danger)",
    badgeTone: "danger" as const,
    ctaLabel: "Join Class",
    headline: "Live now",
  },
  upcoming: {
    accent: "var(--brand-primary-strong)",
    badgeTone: "brand" as const,
    ctaLabel: "Start Class",
    headline: "Coming up next",
  },
} as const;

const EMBEDDABLE_HOSTS = new Set(["meet.jit.si", "daily.co", "zoho.in", "zoho.com"]);
const EMBEDDABLE_SUFFIXES = [".jit.si", ".daily.co", ".zoho.in", ".zoho.com"] as const;

function isEmbeddableUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (EMBEDDABLE_HOSTS.has(host)) return true;
    return EMBEDDABLE_SUFFIXES.some((s) => host.endsWith(s));
  } catch {
    return false;
  }
}

/**
 * Build the meeting URL for the classroom.
 * Only embeddable URLs (Jitsi / Daily.co / Zoho) are used.
 * If the admin stored a non-embeddable URL (Zoom, Google Meet, etc.)
 * we fall through to the Jitsi auto-generated room so the session always
 * stays in-page without any external redirect.
 */
function buildMeetingUrl(classId: string, meetingUrl?: string | null, displayName?: string) {
  if (meetingUrl && isEmbeddableUrl(meetingUrl)) return meetingUrl;

  // Fallback: auto-generate a Jitsi room (free, no setup needed)
  const roomName = `DivergentClass-${classId}`;
  const params = new URLSearchParams();
  if (displayName) params.set("userInfo.displayName", displayName);
  params.set("config.prejoinConfig.enabled", "false");
  params.set("config.startWithAudioMuted", "false");
  params.set("config.startWithVideoMuted", "false");
  params.set("config.disableDeepLinking", "true");
  params.set("config.hideConferenceSubject", "true");

  return `https://meet.jit.si/${roomName}#${params.toString()}`;
}

function getSessionTone(data: LiveClassData | null): SessionTone {
  if (!data) return "empty";
  if (data.live.length > 0) return "live";
  if (data.upcoming.length > 0) return "upcoming";
  if (data.completed.length > 0) return "completed";
  return "empty";
}

function formatSessionTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSessionDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildSessionRail(data: LiveClassData | null) {
  if (!data) return [];

  return [
    ...data.live.map((item) => ({ item, tone: "live" as const })),
    ...data.upcoming.map((item) => ({ item, tone: "upcoming" as const })),
    ...data.completed.map((item) => ({ item, tone: "completed" as const })),
  ];
}

function MessageBubble({
  currentUserId,
  message,
}: {
  currentUserId: string | undefined;
  message: LiveClassMessage;
}) {
  const isCurrentUser = message.senderId === currentUserId;
  const isMentorReply =
    message.senderRole === "MENTOR" ||
    message.senderRole === "ADMIN" ||
    message.senderRole === "SUPER_ADMIN";

  return (
    <div className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[86%] rounded-(--radius-lg) px-4 py-4 ${
          isCurrentUser
            ? "bg-(--brand-primary-strong) text-white shadow-(--shadow-accent)"
            : isMentorReply
              ? "bg-white/12 text-white"
              : "bg-white/8 text-white"
        }`}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-semibold text-white/88">{message.senderName}</span>
          {isMentorReply ? (
            <span className="rounded-full bg-white/12 px-2 py-0.5 uppercase tracking-[0.12em] text-white/72">
              Mentor
            </span>
          ) : null}
          <span className="text-white/45">{formatMessageTime(message.createdAt)}</span>
        </div>

        {message.body ? (
          <p className="text-[14px] leading-7 text-white/90">{message.body}</p>
        ) : null}

        {message.imageUrl ? (
          <div
            aria-label={`Attachment from ${message.senderName}`}
            className="mt-3 h-44 w-full rounded-(--radius-md) bg-black/10"
            role="img"
            style={{
              backgroundImage: `url(${message.imageUrl})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

/* ────────────────── Sub-components ────────────────── */

function NoMeetLinkNotice() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-white/10 text-white/50">
        <Video className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <p className="text-[16px] font-semibold text-white/80">
          Classroom not available
        </p>
        <p className="max-w-[40ch] text-[14px] leading-6 text-white/50">
          This class hasn&apos;t been scheduled yet. Once scheduled, you&apos;ll be able to start the video session directly from here.
        </p>
      </div>
    </div>
  );
}

/* ────────────────── Main Component ────────────────── */

export function LiveClassroomPage({
  brandHref,
  dataEndpoint,
}: {
  brandHref: string;
  dataEndpoint: string;
}) {
  const { user } = useAuth();
  const [data, setData] = useState<LiveClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesOpen, setMessagesOpen] = useState(true);
  const [messages, setMessages] = useState<LiveClassMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Meet embed state
  const [meetStarted, setMeetStarted] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [attendanceTrackingStarted, setAttendanceTrackingStarted] = useState(false);

  const loadMessages = useCallback(
    async (
      classId: string,
      options: { background?: boolean; signal?: AbortSignal } = {},
    ) => {
      const { background = false, signal } = options;

      if (!background) {
        setMessagesLoading(true);
      }

      try {
        const response = await fetch(`/api/live-classes/${classId}/messages`, {
          cache: "no-store",
          signal,
        });
        const json = await response.json();

        if (signal?.aborted) return;
        if (response.ok && json.success) {
          setMessages(json.data);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Failed to load live messages", error);
        }
      } finally {
        if (!background && !signal?.aborted) {
          setMessagesLoading(false);
        }
      }
    },
    [],
  );


  useEffect(() => {
    let active = true;

    fetch(dataEndpoint)
      .then((response) => response.json())
      .then((json) => {
        if (active && json.success) {
          setData(json.data);
        }
      })
      .catch((error) => {
        console.error("Failed to load live classes", error);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [dataEndpoint]);

  const tone = getSessionTone(data);
  const focusClass = useMemo(() => {
    if (!data) return null;
    return data.live[0] ?? data.upcoming[0] ?? data.completed[0] ?? null;
  }, [data]);

  const previewUrl = useMemo(
    () => (selectedImage ? URL.createObjectURL(selectedImage) : null),
    [selectedImage],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset iframe error when class changes
  useEffect(() => {
    setMeetStarted(false);
    setAttendanceMarked(false);
    setAttendanceTrackingStarted(false);
  }, [focusClass?.id]);

  useEffect(() => {
    if (!focusClass?.id) {
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    const controller = new AbortController();
    void loadMessages(focusClass.id, { signal: controller.signal });

    if (!messagesOpen) {
      return () => {
        controller.abort();
      };
    }

    const intervalId = window.setInterval(() => {
      void loadMessages(focusClass.id, { background: true });
    }, 2000);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [focusClass?.id, loadMessages, messagesOpen]);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
  }, [messages]);

  // Mark attendance
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

  // Build meeting URL (Daily.co if configured, otherwise Jitsi fallback)
  const meetingIframeUrl = useMemo(() => {
    if (!focusClass?.id) return null;
    return buildMeetingUrl(focusClass.id, focusClass.meetingUrl, user?.name ?? undefined);
  }, [focusClass?.id, focusClass?.meetingUrl, user?.name]);

  // Start the meeting (embed iframe)
  const startMeeting = useCallback(() => {
    if (!focusClass?.id) return;
    setMeetStarted(true);
    // Mark attendance on first join
    if (!attendanceMarked && !attendanceTrackingStarted) {
      void markAttendance("JOIN");
    }
  }, [focusClass?.id, attendanceMarked, attendanceTrackingStarted, markAttendance]);



  const endClassGlobally = useCallback(async () => {
    if (!focusClass?.id) return;
    try {
      await fetch(`/api/teacher/live-classes/${focusClass.id}/end`, {
        method: "POST",
      });
      setMeetStarted(false);
      void markAttendance("LEAVE");
      window.location.reload();
    } catch (error) {
      console.error("Failed to end class globally", error);
    }
  }, [focusClass?.id, markAttendance]);

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

  const stageHref =
    tone === "completed"
      ? focusClass?.recordingUrl ?? `/dashboard/courses/${focusClass?.courseSlug ?? ""}`
      : `/dashboard/courses/${focusClass?.courseSlug ?? ""}`;

  const sessionRail = buildSessionRail(data).slice(0, 5);
  const meta = toneMeta[tone];
  // A class can always start — Jitsi auto-generates rooms
  const canStartMeeting = Boolean(focusClass?.id);

  async function handleSendMessage() {
    if (!focusClass?.id || sending) return;
    if (!messageBody.trim() && !selectedImage) return;

    setSending(true);
    setSendError("");

    try {
      const formData = new FormData();
      formData.append("body", messageBody);
      if (selectedImage) {
        formData.append("file", selectedImage);
      }

      const response = await fetch(`/api/live-classes/${focusClass.id}/messages`, {
        body: formData,
        method: "POST",
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        setSendError(json.error ?? "Could not send your message.");
        return;
      }

      setMessages((current) => [...current, json.data]);
      setMessageBody("");
      setSelectedImage(null);
    } catch (error) {
      console.error("Failed to send live message", error);
      setSendError("Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-(--bg-subtle) text-(--text-strong)">
        <header className="border-b border-(--line-soft) bg-white/84 px-6 py-4 backdrop-blur-xl lg:px-10">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <BrandLogo href={brandHref} priority size="md" />
            <div className="flex items-center gap-3">
              <Badge tone={meta.badgeTone}>{meta.headline}</Badge>
              {focusClass ? (
                <span className="hidden text-[13px] text-(--text-muted) md:inline">
                  {formatSessionDate(focusClass.startTime)} at {formatSessionTime(focusClass.startTime)}
                </span>
              ) : null}
              {meetStarted && (
                <Badge className="animate-pulse bg-[#ecfdf5] text-[#15803d]" tone="neutral">
                  <Radio className="mr-1 inline h-3 w-3" />
                  Live
                </Badge>
              )}
              {attendanceMarked && (
                <Badge className="bg-[#f0fdf4] text-[#16a34a]" tone="neutral">
                  <CheckCircle2 className="mr-1 inline h-3 w-3" />
                  Attendance Counted
                </Badge>
              )}
              {!attendanceMarked && attendanceTrackingStarted && (
                <Badge className="bg-[rgba(56,193,255,0.12)] text-[#0f766e]" tone="neutral">
                  <CheckCircle2 className="mr-1 inline h-3 w-3" />
                  Tracking Attendance
                </Badge>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-[1440px] space-y-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <RevealSection>
                <div className="space-y-4">
                  <Surface className="relative overflow-hidden px-0 py-0" tone="dark">
                    <div className="relative overflow-hidden rounded-[inherit]">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,193,255,0.28),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,193,7,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_38%)]" />

                      <div className="relative z-10 px-6 py-6 sm:px-8 sm:py-8">
                        <div className="flex flex-col gap-6 border-b border-white/8 pb-6">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-4">
                              <Badge className="w-fit" tone={meta.badgeTone}>
                                {meta.headline}
                              </Badge>
                              <div className="space-y-2">
                                <h1 className="max-w-[18ch] text-[1.85rem] font-semibold tracking-[-0.06em] text-white text-balance sm:text-[clamp(2rem,5vw,4rem)] sm:tracking-[-0.08em]">
                                  {focusClass?.title ?? "Live classroom"}
                                </h1>
                                <p className="max-w-[64ch] text-[14px] leading-6 text-white/68 sm:text-[15px] sm:leading-7">
                                  {focusClass?.courseTitle ??
                                    "As soon as a live or recorded session is available, it will appear here with classroom controls and the discussion thread beside it."}
                                </p>
                              </div>
                            </div>

                            {/* Primary CTA */}
                            {focusClass && tone !== "completed" && canStartMeeting ? (
                              meetStarted ? (
                                <button
                                  onClick={endClassGlobally}
                                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#dc2626] px-5 text-[14px] font-semibold text-white shadow-[0_12px_30px_rgba(220,38,38,0.28)] transition hover:-translate-y-[1px] hover:bg-[#b91c1c] focus-visible:outline-none"
                                >
                                  <PhoneOff className="h-4 w-4" />
                                  End Session
                                </button>
                              ) : (
                                <button
                                  onClick={startMeeting}
                                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-(--text-strong) transition hover:-translate-y-[1px] hover:bg-white/92 focus-visible:outline-none"
                                >
                                  <Video className="h-4 w-4" />
                                  {meta.ctaLabel}
                                </button>
                              )
                            ) : tone === "completed" ? (
                              <Link
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-(--text-strong) transition hover:-translate-y-[1px] hover:bg-white/92 focus-visible:outline-none"
                                href={stageHref}
                              >
                                {meta.ctaLabel}
                                <PlayCircle className="h-4 w-4" />
                              </Link>
                            ) : null}
                          </div>

                          <div className="scrollbar-none flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
                            <div className="min-w-[120px] shrink-0 snap-start rounded-(--radius-md) bg-white/8 px-4 py-3.5 sm:min-w-0 sm:py-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:text-[12px]">
                                Starts
                              </p>
                              <p className="mt-2 text-[15px] font-semibold text-white sm:mt-3 sm:text-[17px]">
                                {focusClass ? formatSessionTime(focusClass.startTime) : "TBD"}
                              </p>
                            </div>
                            <div className="min-w-[120px] shrink-0 snap-start rounded-(--radius-md) bg-white/8 px-4 py-3.5 sm:min-w-0 sm:py-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:text-[12px]">
                                Duration
                              </p>
                              <p className="mt-2 text-[15px] font-semibold text-white sm:mt-3 sm:text-[17px]">
                                {focusClass ? `${focusClass.duration} min` : "Pending"}
                              </p>
                            </div>
                            <div className="min-w-[120px] shrink-0 snap-start rounded-(--radius-md) bg-white/8 px-4 py-3.5 sm:min-w-0 sm:py-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45 sm:text-[12px]">
                                Attendees
                              </p>
                              <p className="mt-2 text-[15px] font-semibold text-white sm:mt-3 sm:text-[17px]">
                                {focusClass ? focusClass.attendeeCount : 0}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Main Stage Area */}
                        <div className="flex min-h-[420px] flex-col justify-between gap-6 py-6 lg:min-h-[540px]">
                          {loading ? (
                            <div className="flex flex-1 items-center justify-center gap-3 text-white/58">
                              <motion.div
                                animate={{ rotate: 360 }}
                                className="h-5 w-5 rounded-full border-2 border-white/60 border-t-transparent"
                                transition={{ duration: 0.9, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
                              />
                              Loading classroom state...
                            </div>
                          ) : focusClass ? (
                            <>
                              {/* Meeting area */}
                              <div className="flex flex-1 flex-col">
                                <AnimatePresence mode="wait">
                                  {meetStarted && meetingIframeUrl ? (
                                    /* Embedded video call */
                                    <motion.div
                                      key="video-iframe"
                                      initial={{ opacity: 0, scale: 0.98 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      exit={{ opacity: 0, scale: 0.98 }}
                                      transition={{ duration: 0.3 }}
                                      className="relative flex flex-1 flex-col"
                                    >
                                      {/* Live indicator bar */}
                                      <div className="flex items-center justify-between rounded-t-[16px] bg-[#16a34a] px-4 py-2">
                                        <div className="flex items-center gap-2">
                                          <motion.span
                                            className="h-2.5 w-2.5 rounded-full bg-white"
                                            animate={{ opacity: [1, 0.3, 1] }}
                                            transition={{ duration: 1.2, repeat: Infinity }}
                                          />
                                          <span className="text-[13px] font-semibold text-white">Live Session — {focusClass.title}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={endClassGlobally}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-[#dc2626] px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-[#b91c1c]"
                                          >
                                            <PhoneOff className="h-3 w-3" />
                                            End
                                          </button>
                                        </div>
                                      </div>

                                      {/* Video call iframe */}
                                      <div className="relative flex-1 overflow-hidden rounded-b-[16px] bg-[#040404]">
                                        <iframe
                                          src={meetingIframeUrl}
                                          className="h-full min-h-[420px] w-full border-0 lg:min-h-[480px]"
                                          allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen"
                                          referrerPolicy="no-referrer-when-downgrade"
                                          style={{ colorScheme: "normal" }}
                                        />
                                      </div>
                                    </motion.div>
                                  ) : !canStartMeeting ? (
                                    <motion.div
                                      key="no-class"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      className="flex flex-1 items-center justify-center"
                                    >
                                      <NoMeetLinkNotice />
                                    </motion.div>
                                  ) : (
                                    /* Ready to start state */
                                    <motion.div
                                      key="ready"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      exit={{ opacity: 0 }}
                                      className="flex flex-1 items-center justify-center"
                                    >
                                      <div className="grid place-items-center gap-6 text-center">
                                        <div
                                          className="grid h-24 w-24 place-items-center rounded-full bg-white/10 shadow-[0_0_0_18px_rgba(255,255,255,0.04)]"
                                          style={{ color: meta.accent }}
                                        >
                                          {tone === "completed" ? (
                                            <PlayCircle className="h-9 w-9" />
                                          ) : (
                                            <Video className="h-9 w-9" />
                                          )}
                                        </div>
                                        <div className="space-y-3">
                                          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/42">
                                            {tone === "live"
                                              ? "Session in progress — join now"
                                              : tone === "completed"
                                                ? "Recording ready"
                                                : "Ready to start"}
                                          </p>
                                          <p className="max-w-[44ch] text-[18px] leading-8 text-white/72">
                                            {focusClass.description?.trim() ||
                                              "Click the button below to start the live session. Video will load right here — students can share sketches via the message panel."}
                                          </p>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* Controls bar */}
                              <div className="scrollbar-none flex snap-x gap-2.5 overflow-x-auto pb-2 sm:flex-wrap sm:items-center sm:justify-center sm:gap-3 sm:overflow-visible sm:pb-0">
                                {canStartMeeting && tone !== "completed" && (
                                  <>
                                    {!meetStarted ? (
                                      <Button
                                        size="lg"
                                        type="button"
                                        onClick={startMeeting}
                                        className="shrink-0 snap-start whitespace-nowrap"
                                      >
                                        <LogIn className="h-4 w-4" />
                                        Start Class
                                      </Button>
                                    ) : (
                                      <button
                                        onClick={endClassGlobally}
                                        className="inline-flex h-14 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full bg-[#dc2626] px-6 text-[15px] font-semibold text-white shadow-[0_18px_40px_rgba(220,38,38,0.24)] transition hover:-translate-y-[1px] hover:bg-[#b91c1c] focus-visible:outline-none"
                                      >
                                        <PhoneOff className="h-4 w-4" />
                                        End Session
                                      </button>
                                    )}
                                  </>
                                )}

                                {tone === "completed" && focusClass.recordingUrl && (
                                  <Link
                                    className="inline-flex h-14 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full bg-white px-6 text-[15px] font-semibold text-(--text-strong) shadow-[0_18px_40px_rgba(255,255,255,0.12)] transition hover:-translate-y-[1px] focus-visible:outline-none"
                                    href={focusClass.recordingUrl}
                                    target="_blank"
                                  >
                                    <PlayCircle className="h-4 w-4" />
                                    Watch Recording
                                  </Link>
                                )}

                                <Button
                                  size="lg"
                                  type="button"
                                  variant="secondary"
                                  onClick={() => markAttendance("JOIN")}
                                  disabled={attendanceMarked || attendanceTrackingStarted || tone !== "live"}
                                  className={`shrink-0 snap-start whitespace-nowrap ${attendanceMarked ? "bg-[#f0fdf4] text-[#15803d] hover:bg-[#dcfce7] hover:text-[#166534]" : attendanceTrackingStarted ? "bg-[rgba(56,193,255,0.12)] text-[#0f766e] hover:bg-[rgba(56,193,255,0.18)] hover:text-[#0f766e]" : ""}`}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  {attendanceMarked
                                    ? "Attendance Counted"
                                    : attendanceTrackingStarted
                                      ? "Tracking Attendance"
                                      : "Start Attendance"}
                                </Button>

                                <Button
                                  size="lg"
                                  type="button"
                                  variant="secondary"
                                  onClick={() => setMessagesOpen((v) => !v)}
                                  className="shrink-0 snap-start whitespace-nowrap"
                                >
                                  <MessageCircleMore className="h-4 w-4" />
                                  {messagesOpen ? "Hide Messages" : "Show Messages"}
                                </Button>
                              </div>
                            </>
                          ) : (
                            <EmptyState
                              description="No live, upcoming, or recorded classes are available yet. As soon as something is scheduled, the classroom shell will activate here."
                              icon={<CalendarClock className="h-6 w-6" />}
                              title="No classes available"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </Surface>

                  {sessionRail.length > 0 ? (
                    <Surface className="px-5 py-5 sm:px-6 sm:py-6">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-(--text-subtle)">
                            Session Queue
                          </p>
                          <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.05em] text-(--text-strong)">
                            Everything around the current classroom.
                          </h2>
                        </div>
                        <Badge tone="brand">{sessionRail.length} visible</Badge>
                      </div>

                      <div className="scrollbar-none flex snap-x gap-3 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
                        {sessionRail.map(({ item, tone: itemTone }) => (
                          <div
                            key={item.id}
                            className="min-w-[280px] shrink-0 snap-start rounded-(--radius-lg) border border-(--line-soft) bg-white/72 px-4 py-4 lg:min-w-0"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={toneMeta[itemTone].badgeTone}>
                                {toneMeta[itemTone].headline}
                              </Badge>
                              <span className="text-[12px] text-(--text-subtle)">
                                {formatSessionDate(item.startTime)}
                              </span>
                            </div>
                            <p className="mt-3 text-[16px] font-semibold tracking-[-0.03em] text-(--text-strong)">
                              {item.title}
                            </p>
                            <div className="mt-3 flex items-center gap-3 text-[13px] text-(--text-muted)">
                              <span>{formatSessionTime(item.startTime)}</span>
                              <span className="h-1 w-1 rounded-full bg-(--text-subtle)/40" />
                              <span>{item.duration} min</span>
                              <span className="h-1 w-1 rounded-full bg-(--text-subtle)/40" />
                              <span>{item.attendeeCount} learners</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Surface>
                  ) : null}
                </div>
              </RevealSection>

              <RevealSection delay={0.06}>
                {messagesOpen ? (
                  <Surface className="flex min-h-[720px] flex-col px-0 py-0" tone="dark">
                    <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-5 sm:px-6">
                      <div className="space-y-2">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/42">
                          Live Messages
                        </p>
                        <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-white">
                          Keep the thread close to the class.
                        </h2>
                        <p className="text-[13px] leading-6 text-white/56">
                          {focusClass
                            ? `${focusClass.courseTitle} discussion`
                            : "Messages will appear as soon as a class is active."}
                        </p>
                      </div>
                      <button
                        className="rounded-full p-2 text-white/52 transition-colors duration-150 hover:bg-white/8 hover:text-white focus-visible:outline-none"
                        onClick={() => setMessagesOpen(false)}
                        type="button"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div
                      className="flex-1 space-y-3 overflow-y-auto px-5 py-5 sm:px-6"
                      ref={messagesContainerRef}
                    >
                      {messagesLoading ? (
                        <div className="flex items-center gap-3 text-[14px] text-white/52">
                          <motion.div
                            animate={{ rotate: 360 }}
                            className="h-4 w-4 rounded-full border-2 border-white/40 border-t-transparent"
                            transition={{ duration: 0.9, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
                          />
                          Loading messages...
                        </div>
                      ) : messages.length > 0 ? (
                        messages.map((message) => (
                          <MessageBubble
                            currentUserId={user?.id}
                            key={message.id}
                            message={message}
                          />
                        ))
                      ) : (
                        <div className="flex h-full min-h-[380px] items-center justify-center">
                          <EmptyState
                            description="No messages yet. Start the thread with a quick question, context note, or image attachment during class."
                            icon={<MessageCircleMore className="h-6 w-6" />}
                            title="No discussion yet"
                          />
                        </div>
                      )}
                    </div>

                    <div className="border-t border-white/8 px-5 py-5 sm:px-6">
                      {previewUrl ? (
                        <div className="mb-4 rounded-(--radius-lg) border border-white/10 bg-white/6 p-3">
                          <div className="flex items-start gap-3">
                            <div
                              aria-label="Selected attachment preview"
                              className="h-16 w-16 rounded-(--radius-md) bg-black/10"
                              role="img"
                              style={{
                                backgroundImage: `url(${previewUrl})`,
                                backgroundPosition: "center",
                                backgroundSize: "cover",
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-white/86">
                                {selectedImage?.name}
                              </p>
                              <button
                                className="mt-2 text-[12px] text-white/54 underline underline-offset-4"
                                onClick={() => setSelectedImage(null)}
                                type="button"
                              >
                                Remove image
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {sendError ? (
                        <p className="mb-3 rounded-(--radius-md) border border-[rgba(255,61,0,0.18)] bg-[rgba(255,61,0,0.08)] px-4 py-3 text-[13px] text-[#ffb09a]">
                          {sendError}
                        </p>
                      ) : null}

                      <div className="rounded-(--radius-lg) border border-white/12 bg-white/6 p-3">
                        <div className="flex items-center gap-2">
                          <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white/8 text-white/64 transition-colors duration-150 hover:bg-white/12 hover:text-white">
                            <ImagePlus className="h-4.5 w-4.5" />
                            <input
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;
                                setSelectedImage(file);
                                setSendError("");
                              }}
                              type="file"
                            />
                          </label>

                          <input
                            className="min-w-0 flex-1 bg-transparent px-2 text-[14px] text-white outline-none placeholder:text-white/40"
                            onChange={(event) => setMessageBody(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void handleSendMessage();
                              }
                            }}
                            placeholder="Send a quick note, question, or context for the mentor..."
                            value={messageBody}
                          />

                          <Button
                            disabled={!messageBody.trim() && !selectedImage}
                            loading={sending}
                            onClick={() => void handleSendMessage()}
                            size="sm"
                            type="button"
                          >
                            <SendHorizontal className="h-4 w-4" />
                            Send
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Surface>
                ) : (
                  <Surface className="flex min-h-[720px] items-center justify-center px-6 py-6" tone="dark">
                    <div className="space-y-4 text-center">
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/8 text-white/72">
                        <MessageCircleMore className="h-6 w-6" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-white">
                          Thread hidden
                        </h2>
                        <p className="max-w-[28ch] text-[14px] leading-7 text-white/58">
                          Reopen the message panel whenever you want the classroom discussion back in view.
                        </p>
                      </div>
                      <Button onClick={() => setMessagesOpen(true)} size="lg" type="button">
                        <MessageCircleMore className="h-4 w-4" />
                        Open messages
                      </Button>
                    </div>
                  </Surface>
                )}
              </RevealSection>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
