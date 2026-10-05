import { getPageAuth } from '@/lib/page-auth';
import { getStudentProgress, getStudentSkillBreakdown } from '@/lib/student-progress';
import ProgressView, { type ProgressInitialData } from './ProgressView';

/**
 * Loads the progress data and the Topic Mastery skills on the server, in
 * parallel and next to the database, so the page arrives with content instead
 * of a spinner waiting on two browser requests made one after the other.
 */
export default async function DashboardProgressPage() {
  // The proxy already sends signed-out users to /login
  const auth = await getPageAuth(['STUDENT']);
  if (!auth) return <ProgressView />;

  let initialData: ProgressInitialData | null = null;
  try {
    const [progress, { skills, skillTestsEvaluated }] = await Promise.all([
      getStudentProgress(auth.userId),
      getStudentSkillBreakdown(auth.userId),
    ]);
    initialData = { progress, skills, skillTestsEvaluated };
  } catch (err) {
    // Fall back to the client-side fetches rather than an error page
    console.error('[PROGRESS_PREFETCH_ERROR]', err);
  }

  return <ProgressView initialData={initialData} />;
}
