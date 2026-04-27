import { LiveClassroomPage } from "@/app/dashboard/_components/live-classroom-page";
import { requirePageAuth } from "@/lib/page-auth";

type TeacherClassroomPageProps = {
  params: Promise<{ classId: string }>;
};

export default async function TeacherClassroomPage({
  params,
}: TeacherClassroomPageProps) {
  const { classId } = await params;

  await requirePageAuth(["MENTOR"]);

  return (
    <LiveClassroomPage
      dataEndpoint={`/api/teacher/live-classes/${classId}`}
      brandHref="/dashboard/teacher/class-control"
    />
  );
}
