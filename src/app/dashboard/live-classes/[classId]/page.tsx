import { StudentLiveClassroomPage } from "@/app/dashboard/_components/student-live-classroom-page";
import { requirePageAuth } from "@/lib/page-auth";

type StudentClassroomPageProps = {
  params: Promise<{ classId: string }>;
};

export default async function StudentClassroomPage({
  params,
}: StudentClassroomPageProps) {
  const { classId } = await params;

  await requirePageAuth();

  return (
    <StudentLiveClassroomPage
      dataEndpoint={`/api/live-classes/${classId}`}
      brandHref="/dashboard/live-classes"
    />
  );
}
