import { NextRequest, NextResponse } from 'next/server';
import { cronAuthError } from '@/lib/cron-auth';
import { checkProductionConfig, isProductionDeployment } from '@/lib/production-config';

/**
 * GET /api/health/config
 *
 * Lists missing or unsafe production settings (variable names and what goes
 * wrong, never values). Protected by CRON_SECRET, since even the names of
 * missing settings are useful to an attacker:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/health/config
 */
export async function GET(req: NextRequest) {
  const authError = cronAuthError(req);
  if (authError === 'not-configured') {
    return NextResponse.json(
      { ready: false, problems: [{ name: 'CRON_SECRET', level: 'error', message: 'Not set: this check (and every cron) is unavailable.' }] },
      { status: 503 },
    );
  }
  if (authError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const problems = checkProductionConfig();
  return NextResponse.json(
    {
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      enforced: isProductionDeployment(),
      ready: problems.every((p) => p.level !== 'error'),
      problems,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
