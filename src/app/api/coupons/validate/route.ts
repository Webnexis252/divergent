import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiError("Unauthorized", 401);

    const { code, courseId, bundleId, installmentIndex } = await req.json();
    if (!code) {
      return apiError("Coupon code is required", 400);
    }
    if (!courseId && !bundleId) {
      return apiError("Course ID or Bundle ID is required", 400);
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return apiError("Invalid coupon code", 404);
    }

    if (!coupon.isActive) {
      return apiError("This coupon is no longer active", 400);
    }

    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      return apiError("This coupon has expired", 400);
    }

    if (coupon.usedCount >= coupon.maxUses) {
      return apiError("This coupon has reached its usage limit", 400);
    }

    let originalPrice = 0;
    
    if (bundleId) {
      const bundle = await (prisma as any).bundle.findUnique({
        where: { id: bundleId },
        select: { price: true, isPublished: true },
      });
      if (!bundle || !bundle.isPublished) return apiError("Bundle not available", 404);
      originalPrice = bundle.price;
    } else {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { price: true, emiPlans: true },
      });
      if (!course) return apiError("Course not found", 404);
      
      const emiPlans = course.emiPlans as any[] | null;
      const isInstallment = typeof installmentIndex === 'number' && emiPlans && emiPlans.length > 0;
      
      if (isInstallment) {
        if (installmentIndex < 0 || installmentIndex >= emiPlans!.length) {
          return apiError("Invalid installment index", 400);
        }
        originalPrice = Number(emiPlans![installmentIndex].amount);
      } else {
        originalPrice = Number(course.price);
      }
    }

    const discountAmount = Number(((originalPrice * coupon.discountPercent) / 100).toFixed(2));
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return apiSuccess({
      discountPercent: coupon.discountPercent,
      code: coupon.code,
      originalPrice,
      discountAmount,
      finalPrice
    });
  } catch (error: any) {
    console.error("[VALIDATE COUPON]", error);
    return apiError("Failed to validate coupon", 500);
  }
}
