import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiCreated, apiForbidden, apiServerError, apiError } from '@/lib/api-response';
import { z } from 'zod';

const CouponSchema = z.object({
  code: z.string().min(3).toUpperCase(),
  discountPercent: z.number().min(1).max(100),
  maxUses: z.number().int().min(1).default(100),
  validUntil: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPER_ADMIN']);
    if (!auth) return apiForbidden('Super Admin access required');

    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    return apiSuccess(coupons);
  } catch (err) {
    console.error('[COUPONS_GET_ERROR]', err);
    return apiServerError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPER_ADMIN']);
    if (!auth) return apiForbidden('Super Admin access required');

    const body = await req.json();
    const parsed = CouponSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const existing = await prisma.coupon.findUnique({ where: { code: parsed.data.code } });
    if (existing) return apiError('Coupon code already exists', 409);

    const coupon = await prisma.coupon.create({
      data: {
        ...parsed.data,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      },
    });

    return apiCreated(coupon, 'Coupon created');
  } catch (err) {
    console.error('[COUPONS_POST_ERROR]', err);
    return apiServerError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['SUPER_ADMIN']);
    if (!auth) return apiForbidden('Super Admin access required');

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return apiError('Coupon ID is required', 400);

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        ...(data.validUntil && { validUntil: new Date(data.validUntil) }),
      },
    });

    return apiSuccess(updated, 'Coupon updated');
  } catch (err) {
    console.error('[COUPONS_PATCH_ERROR]', err);
    return apiServerError();
  }
}
