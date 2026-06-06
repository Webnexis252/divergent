export type Teacher = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "MENTOR" | "ADMIN" | "SUPER_ADMIN";
};

export type Course = {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  overviewContent: string | null;
  thumbnail: string | null;
  price: number;
  isPublished: boolean;
  totalHours: number | null;
  lessonCount: number | null;
  courseRating: number | null;
  autoCalculateRating: boolean;
  enrolledStudents: number | null;
  autoUpdateEnrolled: boolean;
  learningOutcomes: unknown;
  features: unknown;
  testimonials: Array<{ text: string; name: string; rating?: number }> | null;
  faqs: Array<{ question: string; answer: string }> | null;
  category: string | null;
  courseLevel: string | null;
  language: string | null;
  visibility: string;
  pricingType: string;
  publishDate: string | null;
  originalPrice: number | null;
  emiPlans: Array<{ label: string; amount: number; dueDays: number }> | null;
  createdAt: string;
  teachers: Pick<Teacher, "id" | "name" | "email" | "role">[];
  _count: { chapters: number; enrollments: number };
};

export const teacherRoleLabel: Record<Teacher["role"], string> = {
  MENTOR: "Mentor",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

export function getTeacherDisplayName(teacher: Pick<Teacher, "name" | "email"> | null) {
  return teacher?.name?.trim() || teacher?.email || "Not assigned";
}
