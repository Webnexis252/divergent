export type EnrolledCourse = {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  progressPercent: number;
  meta: string;
  description?: string | null;
  teacherName?: string | null;
  enrolledAt?: string;
};

export type DashboardStats = {
  enrollmentCount: number;
  streakCount: number;
  xpPoints: number;
  enrolledCourses: EnrolledCourse[];
};

export const quickActions = [
  {
    label: "Open schedule",
    href: "/dashboard/upcoming",
    description: "See upcoming classes, quizzes, and assignment deadlines.",
  },
  {
    label: "Go to assignments",
    href: "/dashboard/assignments",
    description: "Jump into pending work and submission status.",
  },
  {
    label: "Review doubts",
    href: "/dashboard/doubts",
    description: "Ask a question or return to recent mentor replies.",
  },
] as const;
