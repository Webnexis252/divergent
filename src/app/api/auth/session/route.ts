import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { apiServerError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/session-user';

/**
 * GET /api/auth/session
 * Returns just the signed-in user's identity: what the header, sidebar and
 * role checks need. AuthProvider loads this on every page, so it is a single
 * primary-key lookup; the full profile with enrollments and doubts stays at
 * GET /api/users/me for the pages that use it.
 *
 * Never HTTP-cached: the browser cache is keyed by URL, not by cookie, so a
 * cached response could show the previous user after logout / login on a
 * shared device, or stale details right after a profile update.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const user = auth ? await getSessionUser(auth.userId) : null;

    return NextResponse.json(
      { success: true, data: user },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (err) {
    console.error('[GET_SESSION_ERROR]', err);
    return apiServerError();
  }
}
