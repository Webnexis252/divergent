import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';
import { countEnrollmentsByMonth, sumSuccessfulPaymentsByDay } from '@/lib/analytics-trends';

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
    const startOf30Days = new Date(now);
    startOf30Days.setDate(now.getDate() - 29);
    startOf30Days.setHours(0, 0, 0, 0);

    const [totalRevenue, monthlyRevenue, recentPayments, enrollmentsByMonth, dailyPayments] = await Promise.all([
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
      countEnrollmentsByMonth(startOfYear),

      // Daily successful payment totals for last 30 days
      sumSuccessfulPaymentsByDay(startOf30Days),
    ]);

    // Build monthly enrollment trend chart data
    const monthNames = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const monthlyTrend = monthNames.map((m, i) => ({ month: m, count: enrollmentsByMonth[i] }));

    // Build daily revenue trend for last 30 days
    const dailyMap = new Map<string, number>();
    for (let d = 0; d < 30; d++) {
      const day = new Date(startOf30Days);
      day.setDate(startOf30Days.getDate() + d);
      const key = day.toISOString().slice(0, 10); // YYYY-MM-DD
      dailyMap.set(key, dailyPayments.get(key) ?? 0);
    }
    const dailyRevenue = Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }));

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
      dailyRevenue,
    });
  } catch (err) {
    console.error('[SUPER_ADMIN_REVENUE_ERROR]', err);
    return apiServerError();
  }
}
