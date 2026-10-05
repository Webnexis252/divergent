import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';
import { doubtResponseTimesByMentor } from '@/lib/teacher-analytics';

/**
 * GET /api/admin/mentors
 * List all mentors with performance stats.
 * Returns { active: Mentor[], pending: Mentor[] }
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [mentors, responseTimes] = await Promise.all([prisma.user.findMany({
      where: { role: { in: ['MENTOR', 'ADMIN', 'SUPER_ADMIN'] } },
      select: {
        id: true, name: true, email: true, image: true, role: true,
        createdAt: true, mentorStatus: true,
        _count: { select: { managedDoubts: true, doubtReplies: true } },
        managedDoubts: {
          where: { status: { in: ['RESOLVED', 'CLOSED'] }, updatedAt: { gte: sevenDaysAgo } },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    }), doubtResponseTimesByMentor(thirtyDaysAgo)]);
    const allMentors = mentors.map((m) => ({ ...m, responseTime: responseTimes.get(m.id) ?? null }));

    // Split pending teachers from active team members
    const pending = allMentors.filter(
      (m) => m.role === 'MENTOR' && m.mentorStatus === 'PENDING'
    );
    const active = allMentors.filter(
      (m) => !(m.role === 'MENTOR' && m.mentorStatus === 'PENDING')
    );

    return apiSuccess({ active, pending });
  } catch (err) {
    console.error('[ADMIN_MENTORS_ERROR]', err);
    return apiServerError();
  }
}
