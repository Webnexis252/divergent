import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiCreated, apiForbidden, apiServerError, apiError } from '@/lib/api-response';
import { hashSync } from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPER_ADMIN']);
    if (!auth) return apiForbidden('Super Admin access required');

    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: { id: true, name: true, email: true, role: true, createdAt: true, image: true },
      orderBy: { createdAt: 'asc' },
    });

    return apiSuccess(admins);
  } catch (err) {
    console.error('[ADMINS_GET_ERROR]', err);
    return apiServerError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPER_ADMIN']);
    if (!auth) return apiForbidden('Super Admin access required');

    const body = await req.json();
    
    // Case 1: Bulk promotion of existing users
    if (body.userIds && Array.isArray(body.userIds)) {
      const updated = await prisma.user.updateMany({
        where: { id: { in: body.userIds } },
        data: { role: 'ADMIN' },
      });
      
      const promotedUsers = await prisma.user.findMany({
        where: { id: { in: body.userIds } },
        select: { id: true, name: true, email: true, role: true, createdAt: true, image: true }
      });

      return apiSuccess(promotedUsers, `${updated.count} users promoted to Admin`);
    }

    // Case 2: Create new admin account
    const { name, email, password } = body;
    if (!name || !email || !password) return apiError('Name, email and password are required', 400);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return apiError('An account with this email already exists', 409);

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashSync(password, 10),
        role: 'ADMIN',
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true, image: true },
    });

    return apiCreated(admin, 'Admin account created');
  } catch (err) {
    console.error('[ADMINS_POST_ERROR]', err);
    return apiServerError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPER_ADMIN']);
    if (!auth) return apiForbidden('Super Admin access required');

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return apiError('userId is required', 400);

    // Prevent self-deletion
    if (userId === auth.userId) return apiError('Cannot delete your own account', 400);

    // Downgrade to STUDENT instead of deleting (preserves data)
    await prisma.user.update({ where: { id: userId }, data: { role: 'STUDENT' } });

    return apiSuccess(null, 'Admin access revoked');
  } catch (err) {
    console.error('[ADMINS_DELETE_ERROR]', err);
    return apiServerError();
  }
}
