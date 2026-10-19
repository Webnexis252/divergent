/**
 * Local testing only: set DEV_AUTH_BYPASS in .env to a role (STUDENT, MENTOR,
 * ADMIN or SUPER_ADMIN) and every request is treated as signed in with that
 * role, so pages open without logging in. Always off in production builds,
 * whatever the env says.
 *
 * No Prisma import: the proxy (src/proxy.ts) uses this too.
 */

const ROLES = ['STUDENT', 'MENTOR', 'ADMIN', 'SUPER_ADMIN'] as const;
type BypassRole = (typeof ROLES)[number];

export const DEV_BYPASS_USER_ID = 'dev-bypass-user';

export function getDevBypassUser(): { userId: string; email: string; role: BypassRole } | null {
  if (process.env.NODE_ENV === 'production') return null;
  const role = process.env.DEV_AUTH_BYPASS?.trim().toUpperCase();
  if (!role || !ROLES.includes(role as BypassRole)) return null;
  return { userId: DEV_BYPASS_USER_ID, email: 'dev@localhost', role: role as BypassRole };
}
