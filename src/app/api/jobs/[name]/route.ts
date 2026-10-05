import { NextRequest, NextResponse } from 'next/server';
import { isJobName, verifyQStashSignature } from '@/lib/jobs';
import { runJobStep } from '@/lib/job-handlers';

/**
 * POST /api/jobs/:name
 * Called by Upstash QStash for each queued job step (see src/lib/jobs.ts).
 * Only requests signed with the QStash signing keys are accepted. A non-2xx
 * response makes QStash retry the step with backoff.
 */
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const rawBody = await req.text();

  if (!verifyQStashSignature(req.headers.get('upstash-signature'), rawBody, req.nextUrl.pathname)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  if (!isJobName(name)) {
    return NextResponse.json({ error: `Unknown job ${name}` }, { status: 404 });
  }

  try {
    await runJobStep(name, JSON.parse(rawBody));
    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error(`[JOBS] ${name} step failed`, err);
    return NextResponse.json({ error: 'Job step failed' }, { status: 500 });
  }
}
