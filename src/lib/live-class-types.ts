export type LiveClassItem = {
  id: string;
  title: string;
  description?: string | null;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  startTime: string;
  duration: number;
  meetingUrl: string | null;
  recordingUrl: string | null;
  attendeeCount: number;
  isEnded: boolean;
  resources?: { id: string; title: string; fileUrl: string; type: string }[];
};

export type LiveClassData = {
  summary: { live: number; upcoming: number; completed: number };
  live: LiveClassItem[];
  upcoming: LiveClassItem[];
  completed: LiveClassItem[];
};

export type LiveClassMessage = {
  id: string;
  liveClassId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string | null;
  imageUrl: string | null;
  createdAt: string;
};

export type TeacherScheduleItem = LiveClassItem & {
  status: "live" | "upcoming" | "completed";
  assignmentState: "assigned" | "shared";
};

export type TeacherScheduleData = {
  windowStart: string;
  windowEnd: string;
  counts: {
    today: number;
    nextWeek: number;
    live: number;
  };
  today: TeacherScheduleItem[];
  nextWeek: TeacherScheduleItem[];
};

export type StudentScheduleItem = LiveClassItem & {
  status: "live" | "upcoming" | "completed";
};

export type StudentScheduleData = {
  windowStart: string;
  windowEnd: string;
  counts: {
    today: number;
    thisWeek: number;
    live: number;
  };
  today: StudentScheduleItem[];
  thisWeek: StudentScheduleItem[];
};
