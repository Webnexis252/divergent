import { StudentLiveClassSchedule } from "@/app/dashboard/_components/student-live-class-schedule";
import { getStudentLiveClassData } from "@/lib/live-class-service";
import { getPageAuth } from "@/lib/page-auth";

/**
 * Loads the schedule on the server, next to the database, so it arrives with
 * the page instead of in a second request from the browser after hydration.
 * The client component still fetches on its own if this fails.
 */
export default async function DashboardLiveClassesPage() {
  // The proxy already sends signed-out users to /login
  const auth = await getPageAuth(["STUDENT"]);
  if (!auth) return <StudentLiveClassSchedule />;

  const initialData = await getStudentLiveClassData(auth.userId).catch((err) => {
    console.error("[LIVE_CLASSES_PREFETCH_ERROR]", err);
    return null;
  });
  return <StudentLiveClassSchedule initialData={initialData} />;
}
