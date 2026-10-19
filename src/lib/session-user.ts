import type { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import { DEV_BYPASS_USER_ID, getDevBypassUser } from '@/lib/dev-auth-bypass';

export type SessionUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  image: string | null;
};

/**
 * What every page needs about the signed-in user (header, sidebar, role
 * checks): one primary-key lookup. Used by GET /api/auth/session and by server
 * pages that render before the client-side session has loaded.
 */
export function getSessionUser(userId: string): Promise<SessionUser | null> {
  // The DEV_AUTH_BYPASS user has no database row; answer without the DB so the
  // header and sidebar render even when the test database is down
  const devUser = getDevBypassUser();
  if (devUser && userId === DEV_BYPASS_USER_ID) {
    return Promise.resolve({ id: devUser.userId, name: 'Dev Tester', email: devUser.email, role: devUser.role, image: null });
  }
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, image: true },
  });
}
