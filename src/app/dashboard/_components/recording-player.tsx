"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BookOpen,
  CalendarClock,
  Clock3,
  ExternalLink,
  Film,
  PlayCircle,
  Users,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  PageTransition,
  RevealSection,
} from "./motion-wrappers";

type RecordingData = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  duration: number;
  recordingUrl: string | null;
  courseTitle: string;
  courseSlug: string;
  teacher: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  attendeeCount: number;
};

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    let videoId: string | null = null;

    if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : null;
  } catch {
    return null;
  }
}

function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com/i.test(url);
}

function getGoogleDriveEmbedUrl(url: string): string | null {
  try {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match?.[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return null;
  } catch {
    return null;
  }
}

function isVimeoUrl(url: string): boolean {
  return /vimeo\.com/i.test(url);
}

function getVimeoEmbedUrl(url: string): string | null {
  try {
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (match?.[1]) {
      return `https://player.vimeo.com/video/${match[1]}`;
    }
    return null;
  } catch {
    return null;
  }
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

function getEmbedUrl(url: string): { type: "iframe" | "video" | "external"; src: string } {
  if (isYouTubeUrl(url)) {
    const embed = getYouTubeEmbedUrl(url);
    if (embed) return { type: "iframe", src: embed };
  }

  if (isGoogleDriveUrl(url)) {
    const embed = getGoogleDriveEmbedUrl(url);
    if (embed) return { type: "iframe", src: embed };
  }

  if (isVimeoUrl(url)) {
    const embed = getVimeoEmbedUrl(url);
    if (embed) return { type: "iframe", src: embed };
  }

  if (isDirectVideoUrl(url)) {
    return { type: "video", src: url };
  }

  // Fallback: open externally
  return { type: "external", src: url };
}

export function RecordingPlayer({
  classId,
  dataEndpoint,
}: {
  classId: string;
  dataEndpoint: string;
}) {
  const [data, setData] = useState<RecordingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(dataEndpoint, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || "Failed to load recording");
        }
      })
      .catch((err) => {
        if (!cancelled) setError("Network error — please refresh and try again.");
        console.error("[RECORDING_FETCH_ERROR]", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dataEndpoint]);

  if (loading) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-[#f9fafb]">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex items-center gap-3 text-[#64748b]">
              <Spinner className="h-6 w-6 border-[#38c1ff] text-[#38c1ff]" />
              Loading recording...
            </div>
          </div>
        </main>
      </PageTransition>
    );
  }

  if (error || !data) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-[#f9fafb]">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <EmptyState
              description={error || "This recording could not be loaded."}
              icon={<Film className="h-6 w-6" />}
              title="Recording unavailable"
            />
            <div className="mt-6 text-center">
              <Link
                href="/dashboard/live-classes"
                className="inline-flex items-center gap-2 rounded-full bg-[#38c1ff] px-5 py-2.5 text-[14px] font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Live Classes
              </Link>
            </div>
          </div>
        </main>
      </PageTransition>
    );
  }

  const courseHref = `/dashboard/courses/${data.courseSlug}`;
  const hasRecording = !!data.recordingUrl;

  const sessionDate = new Date(data.startTime).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const sessionTime = new Date(data.startTime).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const embed = hasRecording ? getEmbedUrl(data.recordingUrl!) : null;

  return (
    <PageTransition>
      <main className="min-h-screen overflow-x-hidden bg-[#f9fafb] pb-24 sm:pb-0">
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {/* Back link */}
          <RevealSection>
            <div className="mb-6">
              <Link
                href="/dashboard/live-classes"
                className="inline-flex items-center gap-2 text-[14px] font-medium text-[#64748b] transition hover:text-[#0f172a]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Live Classes
              </Link>
            </div>
          </RevealSection>

          {/* Hero / Video section */}
          <RevealSection delay={0.02}>
            <div className="overflow-hidden rounded-[28px] bg-[#0f172a] shadow-[0_20px_50px_rgba(15,23,42,0.25)]">
              {hasRecording && embed ? (
                embed.type === "iframe" ? (
                  <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                    <iframe
                      src={embed.src}
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      title={`Recording: ${data.title}`}
                    />
                  </div>
                ) : embed.type === "video" ? (
                  <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                    <video
                      className="absolute inset-0 h-full w-full"
                      controls
                      controlsList="nodownload"
                      playsInline
                      src={embed.src}
                    >
                      <source src={embed.src} />
                      Your browser does not support video playback.
                    </video>
                  </div>
                ) : (
                  /* External URL — show a card with link */
                  <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
                    <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-[#38c1ff]/20 text-[#38c1ff]">
                      <PlayCircle className="h-10 w-10" />
                    </div>
                    <h2 className="text-[22px] font-semibold text-white">
                      Recording Available
                    </h2>
                    <p className="mt-2 max-w-md text-[15px] text-white/70">
                      This recording is hosted externally. Click the button below to watch.
                    </p>
                    <a
                      href={data.recordingUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#38c1ff] px-6 py-3 text-[15px] font-semibold text-white shadow-[0_12px_28px_rgba(56,193,255,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(56,193,255,0.4)]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Watch Recording
                    </a>
                  </div>
                )
              ) : (
                /* No recording yet */
                <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
                  <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-white/10 text-white/50">
                    <Film className="h-10 w-10" />
                  </div>
                  <h2 className="text-[22px] font-semibold text-white">
                    Recording Not Available Yet
                  </h2>
                  <p className="mt-2 max-w-md text-[15px] text-white/60">
                    The recording for this class hasn&apos;t been uploaded yet. Check back later or contact your teacher.
                  </p>
                </div>
              )}
            </div>
          </RevealSection>

          {/* Class details */}
          <RevealSection delay={0.06}>
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              {/* Left: info */}
              <div className="space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Badge tone="success">Past Class</Badge>
                    {hasRecording && (
                      <Badge className="bg-[#eff6ff] text-[#2563eb]" tone="neutral">
                        Recording Available
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.03em] text-[#0f172a]">
                    {data.title}
                  </h1>
                  <p className="mt-2 text-[15px] text-[#64748b]">
                    {data.courseTitle}
                  </p>
                  {data.description && (
                    <p className="mt-4 text-[15px] leading-7 text-[#475569]">
                      {data.description}
                    </p>
                  )}
                </div>

                {/* Steps / highlights */}
                <div className="rounded-[24px] border border-white/70 bg-white p-5 shadow-sm sm:p-6">
                  <h3 className="text-[16px] font-semibold text-[#0f172a]">
                    Session Recap
                  </h3>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[16px] bg-[#f7f5f4] px-4 py-3.5">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-black/42">
                        What was covered
                      </p>
                      <p className="mt-2 text-[14px] text-[#475569]">
                        {data.description
                          ? data.description
                          : `This class covered topics in ${data.courseTitle}. Review the recording for full details.`}
                      </p>
                    </div>
                    <div className="rounded-[16px] bg-[#f7f5f4] px-4 py-3.5">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-black/42">
                        Next Steps
                      </p>
                      <p className="mt-2 text-[14px] text-[#475569]">
                        Continue your learning by jumping into the course materials and upcoming classes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: metadata sidebar */}
              <div className="space-y-4">
                <motion.div
                  className="rounded-[24px] border border-white/70 bg-white p-5 shadow-sm"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                    Class Details
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f7f5f4] text-[#64748b]">
                        <CalendarClock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">Date</p>
                        <p className="text-[14px] font-medium text-[#0f172a]">{sessionDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f7f5f4] text-[#64748b]">
                        <Clock3 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">Time</p>
                        <p className="text-[14px] font-medium text-[#0f172a]">{sessionTime} · {data.duration} min</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f7f5f4] text-[#64748b]">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">Attendees</p>
                        <p className="text-[14px] font-medium text-[#0f172a]">{data.attendeeCount} students</p>
                      </div>
                    </div>
                    {data.teacher && (
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f7f5f4] text-[#64748b]">
                          <Video className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">Teacher</p>
                          <p className="text-[14px] font-medium text-[#0f172a]">{data.teacher.name ?? "Divergent Faculty"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Quick links */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16 }}
                >
                  <Link
                    href={courseHref}
                    className="flex items-center gap-3 rounded-[18px] border border-white/70 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#0f172a]">Open Course</p>
                      <p className="truncate text-[12px] text-[#94a3b8]">Continue with {data.courseTitle}</p>
                    </div>
                  </Link>
                  <Link
                    href="/dashboard/live-classes"
                    className="flex items-center gap-3 rounded-[18px] border border-white/70 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#ecfdf5] text-[#059669]">
                      <Video className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#0f172a]">All Live Classes</p>
                      <p className="truncate text-[12px] text-[#94a3b8]">Browse upcoming and past sessions</p>
                    </div>
                  </Link>
                </motion.div>
              </div>
            </div>
          </RevealSection>
        </div>
      </main>
    </PageTransition>
  );
}
