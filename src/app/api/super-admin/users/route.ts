import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';

/**
 * GET /api/super-admin/users
 * Search for users who are NOT admins or super admins.
 * Used for promoting users to admin roles.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPER_ADMIN']);
    if (!auth) return apiForbidden('Super Admin access required');

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? '';

    const users = await prisma.user.findMany({
      where: {
        // Let's allow MENTORs as well.
        role: { in: ['STUDENT', 'MENTOR'] },
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: { id: true, name: true, email: true, role: true, image: true },
      take: 10,
    });

    return apiSuccess(users);
  } catch (err) {
    console.error('[SUPER_ADMIN_USERS_SEARCH_ERROR]', err);
    return apiServerError();
  }
}
