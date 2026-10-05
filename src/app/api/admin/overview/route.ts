import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';
import { getAdminOverview } from '@/lib/admin-overview';

/**
 * GET /api/admin/overview
 * High-level KPI stats for the admin overview page (cached for 30 s).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    return apiSuccess(await getAdminOverview());
  } catch (err) {
    console.error('[ADMIN_OVERVIEW_ERROR]', err);
    return apiServerError();
  }
}
