import { AUTH_COOKIE_NAME } from '@/lib/auth';
import { apiSuccess } from '@/lib/api-response';

export async function POST() {
  const response = apiSuccess({}, 'Logged out successfully');
  
  // Clear the auth cookie by setting it to expire immediately
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
  
  return response;
}
