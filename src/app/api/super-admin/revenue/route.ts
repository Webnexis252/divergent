import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';

/**
 * GET /api/super-admin/revenue
 * Revenue overview: totals, monthly breakdown, per-course.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPER_ADMIN']);
    if (!auth) return apiForbidden('Super Admin access required');

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalRevenue, monthlyRevenue, recentPayments, enrollmentsByMonth] = await Promise.all([
      // Total successful revenue
      prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
        _count: true,
      }),

      // This month revenue
      prisma.payment.aggregate({
        where: { status: 'SUCCESS', createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),

      // Recent 20 payments
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),

      // Enrollments per month this year (proxy for revenue trend since payment is new)
      prisma.enrollment.findMany({
        where: { createdAt: { gte: startOfYear } },
        select: { createdAt: true },
      }),
    ]);

    // Build monthly enrollment trend chart data
    const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const monthCounts = new Array(12).fill(0);
    enrollmentsByMonth.forEach(e => monthCounts[e.createdAt.getMonth()]++);
    const monthlyTrend = monthNames.map((m, i) => ({ month: m, count: monthCounts[i] }));

    return apiSuccess({
      totalRevenue: totalRevenue._sum.amount ?? 0,
      totalTransactions: totalRevenue._count,
      monthlyRevenue: monthlyRevenue._sum.amount ?? 0,
      monthlyTransactions: monthlyRevenue._count,
      recentPayments: recentPayments.map(p => ({
        id: p.id,
        studentName: p.user.name,
        studentEmail: p.user.email,
        amount: p.amount,
        status: p.status,
        couponCode: p.couponCode,
        createdAt: p.createdAt.toISOString(),
      })),
      monthlyTrend,
    });
  } catch (err) {
    console.error('[SUPER_ADMIN_REVENUE_ERROR]', err);
    return apiServerError();
  }
}
