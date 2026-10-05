import { NextRequest } from 'next/server';
import { safeEqual } from '@/lib/secure-compare';

/**
 * Checks `Authorization: Bearer <CRON_SECRET>`, as sent by Vercel Cron and by a
 * QStash schedule created with `Upstash-Forward-Authorization: Bearer <CRON_SECRET>`.
 * Returns null when authorised, or the reason it isn't.
 */
export function cronAuthError(req: NextRequest): 'not-configured' | 'forbidden' | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return 'not-configured';
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
  return safeEqual(token, cronSecret) ? null : 'forbidden';
}
