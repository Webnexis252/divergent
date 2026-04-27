export type UpcomingClassCard = {
  id: string;
  title: string;
  courseTitle: string;
  courseSlug: string;
  startTime: string;
  duration: number;
  meetingUrl: string | null;
};

export type UpcomingExamCard = {
  quizId: string;
  title: string;
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  courseSlug: string;
  ctaHref: string;
  availabilityLabel: string;
};

export type UpcomingAssignmentCard = {
  id: string;
  title: string;
  courseTitle: string;
  courseSlug: string | null;
  deadline: string | null;
  points: number;
};

export type UpcomingOverviewResponse = {
  nextClass: UpcomingClassCard | null;
  nextExam: UpcomingExamCard | null;
  nextAssignment: UpcomingAssignmentCard | null;
  counts: {
    upcomingClasses: number;
    openExams: number;
    pendingAssignments: number;
  };
};
