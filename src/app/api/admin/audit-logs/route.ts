import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';
import { NextRequest } from 'next/server';

/**
 * GET /api/admin/audit-logs
 * Returns audit logs. Supports ?entityType=, ?actorId=, ?limit=
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPER_ADMIN']);
    if (!auth) return apiForbidden('Super Admin access required');

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') ?? undefined;
    const actorId = searchParams.get('actorId') ?? undefined;
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(entityType ? { entityType } : {}),
        ...(actorId ? { actorId } : {}),
      },
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });

    return apiSuccess(logs);
  } catch (err) {
    console.error('[AUDIT_LOGS_ERROR]', err);
    return apiServerError();
  }
}
