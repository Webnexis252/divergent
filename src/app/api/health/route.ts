import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/health
 *
 * Health-check endpoint for uptime monitoring services (e.g. UptimeRobot,
 * Vercel Cron, Datadog Synthetics).
 *
 * Returns:
 *  - 200 with `{ status: "ok" }` when the app and database are healthy
 *  - 503 with `{ status: "degraded" }` when the database is unreachable
 */
export async function GET() {
  const start = Date.now();

  let dbHealthy = false;
  try {
    // A lightweight query to verify DB connectivity
    await prisma.$queryRaw`SELECT 1`;
    dbHealthy = true;
  } catch {
    dbHealthy = false;
  }

  const latencyMs = Date.now() - start;

  const payload = {
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    latencyMs,
    checks: {
      database: dbHealthy ? 'connected' : 'unreachable',
    },
  };

  return NextResponse.json(payload, {
    status: dbHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
