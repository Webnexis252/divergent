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
  { label: "Live Classes", href: "/dashboard/live-classes", icon: Video, active: true },
  { label: "Community", href: "/dashboard/community", icon: MessageSquareText },
  { label: "Assignments", href: "/dashboard/assignments", icon: NotebookPen },
  { label: "Progress", href: "/dashboard/progress", icon: ChartNoAxesColumn },
  { label: "Calendar", href: "/dashboard/upcoming", icon: CalendarDays },
] as const;

export const toneMeta = {
  completed: {
    badgeTone: "success" as const,
    badgeLabel: "Past Class",
    heroEyebrow: "Class Replay",
    heroTitle: "This class is wrapped and ready to revisit.",
    heroDescription: "Review the session flow, jump back into the course, and open the recording when it is available.",
    primaryLabel: "Watch Recording",
    railLabel: "Recording",
    railValue: "Ready to review",
    accentClass: "bg-[linear-gradient(135deg,#fff1b2_0%,#f7f5f4_52%,#ffffff_100%)] text-black",
    stageClass: "bg-[linear-gradient(135deg,#fff5c6_0%,#ffffff_100%)] text-black",
    actionClass: "bg-[#fec600] text-black shadow-[0_8px_24px_rgba(254,198,0,0.32)] hover:-translate-y-0.5",
    secondaryActionClass: "border border-black/10 bg-white text-black hover:-translate-y-0.5",
  },
  empty: {
    badgeTone: "neutral" as const,
    badgeLabel: "Classroom",
    heroEyebrow: "Live Classroom",
    heroTitle: "Classroom unavailable",
    heroDescription: "The classroom could not be loaded. Refresh and try again in a moment.",
    primaryLabel: "Back to schedule",
    railLabel: "Status",
    railValue: "Unavailable",
    accentClass: "bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white",
    stageClass: "bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white",
    actionClass: "bg-[#38c1ff] text-white shadow-[0_8px_24px_rgba(56,193,255,0.3)] hover:-translate-y-0.5",
    secondaryActionClass: "border border-white/20 bg-white/10 text-white hover:-translate-y-0.5",
  },
  live: {
    badgeTone: "danger" as const,
    badgeLabel: "Live Now",
    heroEyebrow: "Ongoing Class",
    heroTitle: "Your live class is in session right now.",
    heroDescription: "Join the stream, track your attendance, and use the class thread for questions — all without leaving the dashboard.",
    primaryLabel: "Join Class",
    railLabel: "Room Status",
    railValue: "Open now",
    accentClass: "bg-[linear-gradient(135deg,#1152c4_0%,#38c1ff_72%,#8fe4ff_100%)] text-white",
    stageClass: "bg-[linear-gradient(135deg,#081b39_0%,#1152c4_55%,#38c1ff_100%)] text-white",
    actionClass: "bg-[#ff5e2f] text-white shadow-[0_8px_24px_rgba(255,94,47,0.35)] hover:-translate-y-0.5 hover:bg-[#e8512a]",
    secondaryActionClass: "border border-white/20 bg-white/12 text-white hover:-translate-y-0.5 hover:bg-white/18",
  },
  upcoming: {
    badgeTone: "brand" as const,
    badgeLabel: "Upcoming",
    heroEyebrow: "Upcoming Class",
    heroTitle: "Your next live class is lined up and ready.",
    heroDescription: "Review the schedule, open the course context, and step into the room from the same route when class begins.",
    primaryLabel: "Enter Class",
    railLabel: "Room Status",
    railValue: "Opens at start time",
    accentClass: "bg-[linear-gradient(135deg,#0f4fc5_0%,#38c1ff_72%,#9ce6ff_100%)] text-white",
    stageClass: "bg-[linear-gradient(135deg,#0d3d96_0%,#38c1ff_100%)] text-white",
    actionClass: "bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.14)] hover:-translate-y-0.5",
    secondaryActionClass: "border border-white/20 bg-white/12 text-white hover:-translate-y-0.5 hover:bg-white/18",
  },
} as const;

const EMBEDDABLE_MEETING_HOSTS = new Set(["meet.jit.si", "daily.co", "zoho.in", "zoho.com"]);
const EMBEDDABLE_MEETING_SUFFIXES = [".jit.si", ".daily.co", ".zoho.in", ".zoho.com"] as const;

function isEmbeddableUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (EMBEDDABLE_MEETING_HOSTS.has(host)) return true;
    return EMBEDDABLE_MEETING_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

export function buildMeetingUrl(classId: string, meetingUrl?: string | null, displayName?: string) {
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
  return new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export function formatLongSessionDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function formatSessionWindow(startTime: string, duration: number) {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  return `${start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

export function actionButtonStyles(className?: string) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-all duration-150 ease-out",
    className,
  );
}

export function getToneHighlights(item: LiveClassItem, tone: Exclude<SessionTone, "empty">, attendanceMarked: boolean) {
  if (tone === "live") {
    return [
      { label: "Room Status", value: "Open and ready to join" },
      { label: "Course", value: item.courseTitle },
      { label: "Attendance", value: attendanceMarked ? "Marked Present ✓" : "Watch 30+ min to qualify" },
    ];
  }
  if (tone === "upcoming") {
    return [
      { label: "Room Status", value: "Closed until start time" },
      { label: "Course", value: item.courseTitle },
      { label: "Duration", value: `${item.duration} minutes` },
    ];
  }
  return [
    { label: "Room Status", value: "Session concluded" },
    { label: "Course", value: item.courseTitle },
    { label: "Attendance", value: attendanceMarked ? "Verified ✓" : "Not counted" },
  ];
}

export function getStateSteps(tone: SessionTone, item: LiveClassItem | null, attendanceMarked: boolean) {
  if (!item) return [];
  if (tone === "live") {
    return [
      "Join directly from this page — no redirects, no broken flows.",
      attendanceMarked
        ? "Your attendance has been counted for this session. Great job!"
        : "Stay in class for at least 30 minutes to have your attendance recorded.",
      "Use the class thread below to ask questions or share notes in real time.",
    ];
  }
  if (tone === "completed") {
    return [
      item.recordingUrl ? "Replay the session recording at your own pace." : "The recording hasn't been uploaded yet — check back soon.",
      attendanceMarked ? "Your attendance was counted for this session." : "Attendance is tracked only during the live session (30+ minutes).",
      "Review the class thread for any discussion or follow-up material.",
      "Return to the course page to continue with the next lesson.",
    ];
  }
  return [
    "Note the exact start time so you're ready the moment the room opens.",
    "Open the course page to review related lesson material before class.",
    "Your attendance will be tracked automatically once you join and stay for 30+ minutes.",
  ];
}
