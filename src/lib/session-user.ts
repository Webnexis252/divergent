import type { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';

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
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, image: true },
  });
}
