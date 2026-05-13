import { RecordingPlayer } from "@/app/dashboard/_components/recording-player";
import { requirePageAuth } from "@/lib/page-auth";

type RecordingPageProps = {
  params: Promise<{ classId: string }>;
};

export default async function RecordingPage({ params }: RecordingPageProps) {
  const { classId } = await params;
  await requirePageAuth();

  return (
    <RecordingPlayer
      classId={classId}
      dataEndpoint={`/api/live-classes/${classId}/recording`}
    />
  );
}
