import { NextRequest, NextResponse } from 'next/server';
import { isValidUnsubscribeToken, optOutOfWeeklyReports } from '@/lib/weekly-reports';

/**
 * Weekly report unsubscribe link (signed per user, see unsubscribeUrl()).
 *
 * GET shows a confirmation button rather than unsubscribing outright, because
 * mail scanners open links in emails; POST does the opt-out. POST is also the
 * one-click target of the List-Unsubscribe header (RFC 8058).
 */
function page(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f5f6f8;font-family:'Segoe UI',Montserrat,sans-serif">
<main style="max-width:440px;margin:80px auto;padding:32px;background:#fff;border-radius:24px;box-shadow:0 4px 24px rgba(0,0,0,0.08);text-align:center">
<h1 style="margin:0 0 12px;font-size:22px;color:#101828">${title}</h1>${body}</main></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

function readParams(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('u') ?? '';
  const token = req.nextUrl.searchParams.get('t') ?? '';
  return { userId, token, valid: Boolean(userId && token) && isValidUnsubscribeToken(userId, token) };
}

export async function GET(req: NextRequest) {
  const { valid } = readParams(req);
  if (!valid) return page('Link not valid', '<p style="color:#6b7280">This unsubscribe link is incomplete or has been changed.</p>', 400);
  return page(
    'Stop weekly reports?',
    `<p style="color:#6b7280;margin:0 0 24px">You'll stop getting the Sunday progress email. Everything else stays the same.</p>
<form method="post" action="${req.nextUrl.pathname}${req.nextUrl.search}">
<button type="submit" style="background:#209bd2;color:#fff;border:0;border-radius:12px;padding:13px 28px;font-weight:700;font-size:14px;cursor:pointer">Unsubscribe</button>
</form>`,
  );
}

export async function POST(req: NextRequest) {
  const { userId, valid } = readParams(req);
  if (!valid) return page('Link not valid', '<p style="color:#6b7280">This unsubscribe link is incomplete or has been changed.</p>', 400);
  try {
    await optOutOfWeeklyReports(userId);
    return page("You're unsubscribed", '<p style="color:#6b7280;margin:0">You won\'t get weekly progress reports any more.</p>');
  } catch (err) {
    console.error('[REPORT_UNSUBSCRIBE_ERROR]', err);
    return page('Something went wrong', '<p style="color:#6b7280">Please try the link again in a minute.</p>', 500);
  }
}
