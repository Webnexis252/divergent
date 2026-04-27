import { UserRole } from '@prisma/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE_NAME, JwtPayload, verifyTokenValue } from './auth';

/**
 * Reads the auth token from cookies during page rendering and enforces RBAC
 * using the same JWT payload shape as API routes.
 */
export async function getPageAuth(
  allowedRoles?: UserRole[],
): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;

  const user = await verifyTokenValue(token);
  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;
  return user;
}

export async function requirePageAuth(
  allowedRoles?: UserRole[],
  redirectTo = '/login',
): Promise<JwtPayload> {
  const user = await getPageAuth(allowedRoles);
  if (!user) redirect(redirectTo);
  return user;
}
