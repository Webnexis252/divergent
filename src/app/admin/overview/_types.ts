export type AdminOverviewData = {
  kpis: {
    totalStudents: number;
    activeEnrollments: number;
    openDoubts: number;
    publishedCourses: number;
    newStudentsThisWeek: number;
  };
  recentEnrollments: {
    studentName: string | null;
    studentEmail: string | null;
    courseTitle: string;
    createdAt: string;
  }[];
  recentDoubts: {
    id: string;
    subject: string;
    studentName: string | null;
    priority: "LOW" | "MEDIUM" | "HIGH";
    createdAt: string;
  }[];
};

export const priorityTone = {
  LOW: "bg-[#eefcf3] text-[#15803d]",
  MEDIUM: "bg-[#fff7df] text-[#b45309]",
  HIGH: "bg-[#fff1f2] text-[#dc2626]",
} as const;
