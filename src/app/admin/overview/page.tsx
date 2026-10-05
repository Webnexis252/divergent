import { getPageAuth } from '@/lib/page-auth';
import { getAdminOverview } from '@/lib/admin-overview';
import AdminOverview from './AdminOverview';

/**
 * Loads the KPIs on the server (from the shared 30 s cache) so the overview
 * renders with numbers instead of skeletons while the browser fetches them.
 */
export default async function AdminOverviewPage() {
  // Same check as GET /api/admin/overview: the data includes student names and emails.
  const auth = await getPageAuth(['ADMIN', 'SUPER_ADMIN']);
  if (!auth) return <AdminOverview />;

  let initialData = null;
  try {
    initialData = await getAdminOverview();
  } catch (err) {
    // Fall back to the client-side fetch rather than an error page.
    console.error('[ADMIN_OVERVIEW_PREFETCH_ERROR]', err);
  }
  return <AdminOverview initialData={initialData} />;
}
