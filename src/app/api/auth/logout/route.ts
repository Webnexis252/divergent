import { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, getRequestToken, readTokenClaims } from '@/lib/auth';
import { apiSuccess } from '@/lib/api-response';
import { revokeToken } from '@/lib/session-revocation';

export async function POST(req: NextRequest) {
  // Revoke this device's token server-side too, so a copy of it (stolen
  // cookie, shared computer) stops working instead of lasting out its 7 days
  try {
    const claims = await readTokenClaims(getRequestToken(req));
    if (claims?.jti) await revokeToken(claims.jti, claims.exp);
  } catch (err) {
    console.error('[LOGOUT_REVOKE_ERROR]', err);
  }

  const response = await apiSuccess({}, 'Logged out successfully');
  
  // Clear the auth cookie by setting it to expire immediately
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  
  return response;
}
