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
  description: string | null;
  thumbnail: string | null;
  price: number;
  isPublished: boolean;
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
