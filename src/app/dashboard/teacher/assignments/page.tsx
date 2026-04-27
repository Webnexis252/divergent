import { requirePageAuth } from "@/lib/page-auth";
import { TeacherAssignmentsView } from "@/app/dashboard/_components/teacher-assignments-view";

export default async function TeacherAssignmentsPage() {
  await requirePageAuth(["MENTOR"]);
  return <TeacherAssignmentsView />;
}
