export type AdminLiveClass = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  startTime: string;
  duration: number;
  meetingUrl: string | null;
  recordingUrl: string | null;
  createdAt: string;
  course: {
    id: string;
    title: string;
    slug: string;
    teacher: {
      id: string;
      name: string | null;
      email: string | null;
    } | null;
  };
  _count: { attendances: number };
};

export type CourseSummary = {
  id: string;
  title: string;
  slug: string;
  teacher: { id: string; name: string | null; email: string | null } | null;
};

export function getLiveClassStatus(startTime: string, duration: number): "live" | "upcoming" | "completed" {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = start + duration * 60 * 1000;

  if (start <= now && now <= end) return "live";
  if (end < now) return "completed";
  return "upcoming";
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
