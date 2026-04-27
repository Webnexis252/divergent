import { TeacherClassControl } from "@/app/dashboard/_components/teacher-class-control";
import { requirePageAuth } from "@/lib/page-auth";

export default async function TeacherClassControlPage() {
  await requirePageAuth(["MENTOR"]);
  return <TeacherClassControl />;
}
