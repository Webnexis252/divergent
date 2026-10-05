import { SWRConfig } from 'swr';
import { getPageAuth } from '@/lib/page-auth';
import { getSessionUser } from '@/lib/session-user';
import { getStudentDashboardStats, getUpcomingOverview } from '@/lib/student-dashboard';
import StudentDashboard from './_components/student-dashboard';

/**
 * Loads the dashboard's data on the server, next to the database, so the page
 * arrives with it instead of showing a spinner while the browser fetches the
 * session, stats and overview one after another.
 *
 * The SWR fallback is keyed by the same URLs the client component fetches and
 * mirrors their JSON exactly, so SWR shows it immediately and revalidates in
 * the background as before.
 */
export default async function DashboardPage() {
  // The proxy already sends signed-out users to /login and staff elsewhere.
  const auth = await getPageAuth(['STUDENT']);
  if (!auth) return <StudentDashboard />;

  let user, stats, overview;
  try {
    [user, stats, overview] = await Promise.all([
      getSessionUser(auth.userId),
      getStudentDashboardStats(auth.userId),
      getUpcomingOverview(auth.userId),
    ]);
  } catch (err) {
    // Fall back to the client-side fetches rather than an error page.
    console.error('[DASHBOARD_PREFETCH_ERROR]', err);
    return <StudentDashboard />;
  }

  const fallback: Record<string, unknown> = {
    '/api/users/me/upcoming-overview': asApiJson(overview),
  };
  if (stats) fallback['/api/users/me/stats'] = asApiJson(stats);

  return (
    <SWRConfig value={{ fallback }}>
      <StudentDashboard initialUser={user} />
    </SWRConfig>
  );
}

/** The `{ success, data }` body the API route would return, with Dates as ISO strings. */
function asApiJson<T>(data: T) {
  return JSON.parse(JSON.stringify({ success: true, data }));
}
