import { cx } from "@/lib/cx";
import type { LiveClassData, LiveClassItem } from "@/lib/live-class-types";
import {
  House,
  BookOpen,
  Video,
  MessageSquareText,
  NotebookPen,
  ChartNoAxesColumn,
  CalendarDays,
} from "lucide-react";

export type SessionTone = "live" | "upcoming" | "completed" | "empty";

export const assets = {
  headerAvatar: "https://ui-avatars.com/api/?name=Student&background=925fe2&color=fff",
} as const;

export const sidebarItems = [
  { label: "Dashboard", href: "/dashboard", icon: House },
  { label: "Courses", href: "/dashboard/courses", icon: BookOpen },
  {
    label: "Live Classes",
    href: "/dashboard/live-classes",
    icon: Video,
    active: true,
  },
  { label: "Community", href: "/dashboard/community", icon: MessageSquareText },
  {
    label: "Assignments",
    href: "/dashboard/assignments",
    icon: NotebookPen,
  },
  { label: "Progress", href: "/dashboard/progress", icon: ChartNoAxesColumn },
  { label: "Calendar", href: "/dashboard/upcoming", icon: CalendarDays },
] as const;

export const toneMeta = {
  completed: {
    badgeTone: "success" as const,
    badgeLabel: "Past Class",
    heroEyebrow: "Class Replay",
    heroTitle: "This class is wrapped and ready to revisit.",
    heroDescription:
      "Review the session flow, jump back into the course, and open the recording when it is available.",
    primaryLabel: "Watch Recording",
    railLabel: "Recording",
    railValue: "Ready to review",
    accentClass:
      "bg-[linear-gradient(135deg,#fff1b2_0%,#f7f5f4_52%,#ffffff_100%)] text-black",
    stageClass:
      "bg-[linear-gradient(135deg,#fff5c6_0%,#ffffff_100%)] text-black",
    actionClass:
      "bg-[#fec600] text-black shadow-[0_12px_28px_rgba(254,198,0,0.28)] hover:-translate-y-0.5",
    secondaryActionClass:
      "border border-black/10 bg-white text-black hover:-translate-y-0.5",
  },
  empty: {
    badgeTone: "neutral" as const,
    badgeLabel: "Classroom",
    heroEyebrow: "Live Classroom",
    heroTitle: "Classroom unavailable",
    heroDescription:
      "The classroom could not be loaded. Refresh and try again in a moment.",
    primaryLabel: "Back to schedule",
    railLabel: "Status",
    railValue: "Unavailable",
    accentClass: "bg-[#38c1ff] text-white",
    stageClass:
      "bg-[linear-gradient(135deg,#0f4fc5_0%,#38c1ff_100%)] text-white",
    actionClass:
      "bg-white text-black shadow-[0_12px_28px_rgba(0,0,0,0.12)] hover:-translate-y-0.5",
    secondaryActionClass:
      "border border-white/30 bg-white/12 text-white hover:-translate-y-0.5",
  },
  live: {
    badgeTone: "danger" as const,
    badgeLabel: "Live Now",
    heroEyebrow: "Ongoing Class",
    heroTitle: "Everything you need for the live room is right here.",
    heroDescription:
      "Keep the stream, the session thread, and the course route in one student-dashboard workspace.",
    primaryLabel: "Join Class",
    railLabel: "Room",
    railValue: "Open now",
    accentClass:
      "bg-[linear-gradient(135deg,#1152c4_0%,#38c1ff_72%,#8fe4ff_100%)] text-white",
    stageClass:
      "bg-[linear-gradient(135deg,#081b39_0%,#1152c4_55%,#38c1ff_100%)] text-white",
    actionClass:
      "bg-[#ff5e2f] text-white shadow-[0_14px_32px_rgba(255,94,47,0.24)] hover:-translate-y-0.5",
    secondaryActionClass:
      "border border-white/30 bg-white/14 text-white hover:-translate-y-0.5",
  },
  upcoming: {
    badgeTone: "brand" as const,
    badgeLabel: "Upcoming",
    heroEyebrow: "Upcoming Class",
    heroTitle: "Your next live class is lined up and ready.",
    heroDescription:
      "Review the schedule, open the course context, and step into the room from the same route when class begins.",
    primaryLabel: "Enter Class",
    railLabel: "Starts",
    railValue: "Coming up soon",
    accentClass:
      "bg-[linear-gradient(135deg,#0f4fc5_0%,#38c1ff_72%,#9ce6ff_100%)] text-white",
    stageClass:
      "bg-[linear-gradient(135deg,#0d3d96_0%,#38c1ff_100%)] text-white",
    actionClass:
      "bg-white text-black shadow-[0_12px_28px_rgba(0,0,0,0.12)] hover:-translate-y-0.5",
    secondaryActionClass:
      "border border-white/30 bg-white/14 text-white hover:-translate-y-0.5",
  },
} as const;

const EMBEDDABLE_MEETING_HOSTS = new Set([
  "meet.jit.si",
  "daily.co",
  "zoho.in",
  "zoho.com",
]);

const EMBEDDABLE_MEETING_SUFFIXES = [
  ".jit.si",
  ".daily.co",
  ".zoho.in",
  ".zoho.com",
] as const;

function isEmbeddableUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (EMBEDDABLE_MEETING_HOSTS.has(host)) return true;
    return EMBEDDABLE_MEETING_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

/**
 * Returns an embeddable meeting URL for the student classroom.
 * If the stored meetingUrl is a non-embeddable external provider
 * (e.g. Zoom or Google Meet), it is intentionally ignored and
 * a Jitsi room is generated instead — keeping the student fully
 * in-page with no redirects.
 */
export function buildMeetingUrl(
  classId: string,
  meetingUrl?: string | null,
  displayName?: string,
) {
  // Only honour the admin-set URL if it can actually be embedded.
  // Non-embeddable URLs (Zoom, Google Meet, etc.) fall through
  // to the Jitsi fallback so students are never redirected externally.
  if (meetingUrl && isEmbeddableUrl(meetingUrl)) return meetingUrl;

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

export function canEmbedMeetingUrl(meetingUrl?: string | null) {
  if (!meetingUrl) return false;
  return isEmbeddableUrl(meetingUrl);
}

export function getSessionTone(data: LiveClassData | null): SessionTone {
  if (!data) return "empty";
  if (data.live.length > 0) return "live";
  if (data.upcoming.length > 0) return "upcoming";
  if (data.completed.length > 0) return "completed";
  return "empty";
}

export function formatSessionTime(value: string) {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLongSessionDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatSessionWindow(startTime: string, duration: number) {
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

export function actionButtonStyles(className?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-[12px] px-4 py-3 text-[14px] font-semibold transition-transform duration-[var(--transition-fast)] ease-[var(--ease-standard)]",
    className,
  );
}

export function getToneHighlights(
  item: LiveClassItem,
  tone: Exclude<SessionTone, "empty">,
  attendanceMarked: boolean,
) {
  if (tone === "live") {
    return [
      { label: "Room Status", value: "Open and ready to join" },
      { label: "Course", value: item.courseTitle },
      {
        label: "Attendance",
        value: attendanceMarked
          ? "Marked Present"
          : "Watch at least 30 minutes to count this class",
      },
    ];
  }
  if (tone === "upcoming") {
    return [
      { label: "Room Status", value: "Closed until start time" },
      { label: "Course", value: item.courseTitle },
      { label: "Expected Duration", value: `${item.duration} minutes` },
    ];
  }
  return [
    { label: "Room Status", value: "Session concluded" },
    { label: "Course", value: item.courseTitle },
    { label: "Attendance", value: attendanceMarked ? "Verified" : "Missed" },
  ];
}

export function getStateSteps(
  tone: SessionTone,
  item: LiveClassItem | null,
  attendanceMarked: boolean,
) {
  if (!item) return [];

  if (tone === "live") {
    return [
      "Join directly from this page without breaking the route.",
      attendanceMarked
        ? "Your attendance has already been marked for this session."
        : "Attendance counts after you complete at least 30 minutes in the live room.",
      "Use the class thread below for quick questions and image updates.",
    ];
  }

  if (tone === "completed") {
    return [
      item.recordingUrl
        ? "Replay the session recording whenever you need a refresher."
        : "The recording has not been uploaded yet, so the course page is the best next stop.",
      attendanceMarked
        ? "Your attendance was counted for this session."
        : "Attendance only counts after 30 minutes of watch time in the live room.",
      "Review any notes or follow-up questions in the class thread.",
      "Jump back to the course page to keep moving through the module.",
    ];
  }

  return [
    "Check the class window so you know exactly when the room begins.",
    "Open the course page if you want the surrounding lesson context before class.",
    "Keep the discussion thread handy for pre-class questions and reminders.",
  ];
}
