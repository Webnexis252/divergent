export type StudentEnrollment = {
  courseId: string;
  status: string;
  progressPercent: number;
  course: { title: string };
};

export type StudentRecord = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  xpPoints: number;
  _count: {
    enrollments: number;
    createdDoubts: number;
    assignmentSubmissions: number;
  };
  enrollments: StudentEnrollment[];
};
