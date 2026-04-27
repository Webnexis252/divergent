import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get('action') || 'login';
  const role = searchParams.get('role') || 'STUDENT';

  // We enforce that the environment variables exist
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID.' },
      { status: 500 }
    );
  }

  // Build the callback URL dynamically based on the current host
  const callbackUrl = new URL('/api/auth/google/callback', req.url).toString();

  // We pass the action and role in the State parameter so we know what they 
  // requested even after Google redirects them back to us.
  const statePayload = Buffer.from(JSON.stringify({ action, role })).toString('base64');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'select_account');
  authUrl.searchParams.set('state', statePayload);

  return NextResponse.redirect(authUrl.toString());
}
