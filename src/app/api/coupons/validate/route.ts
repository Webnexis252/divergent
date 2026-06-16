import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiError("Unauthorized", 401);

    const body = await req.json();
    const { code, courseId, bundleId, installmentIndex, planId } = body;
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

    // Enforce course-level restriction
    const applicableIds = (coupon as any).applicableCourseIds as string[] | undefined;
    if (Array.isArray(applicableIds) && applicableIds.length > 0) {
      const targetId = courseId ?? bundleId;
      if (!applicableIds.includes(targetId)) {
        return apiError("This coupon is not valid for the selected course or bundle", 400);
      }
    }

    if (coupon.limitPerLearner) {
      const userUsageCount = await prisma.payment.count({
        where: {
          userId: auth.userId,
          couponCode: coupon.code,
          status: 'SUCCESS'
        }
      });
      if (userUsageCount >= coupon.limitPerLearner) {
        return apiError(`You have already reached the usage limit for this coupon (${coupon.limitPerLearner})`, 400);
      }
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
      
      const rawEmiPlans = course.emiPlans as any[] | null;
      let emiPlans: any[] | null = null;
      if (rawEmiPlans && rawEmiPlans.length > 0) {
        if (rawEmiPlans[0]?.installments) {
          emiPlans = rawEmiPlans;
        } else {
          emiPlans = [{ id: "legacy", name: "Installment Plan", installments: rawEmiPlans }];
        }
      }

      const isInstallment = typeof installmentIndex === 'number' && emiPlans && emiPlans.length > 0;
      
      if (isInstallment) {
        const selectedPlan = planId ? emiPlans!.find(p => p.id === planId) : emiPlans![0];
        if (!selectedPlan) return apiError("Invalid plan selected", 400);

        if (installmentIndex < 0 || installmentIndex >= selectedPlan.installments.length) {
          return apiError("Invalid installment index", 400);
        }
        originalPrice = Number(selectedPlan.installments[installmentIndex].amount);
      } else {
        originalPrice = Number(course.price);
      }
    }

    if (coupon.minPurchase && originalPrice < coupon.minPurchase) {
      return apiError(`Minimum purchase amount for this coupon is ${coupon.minPurchase}`, 400);
    }

    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = Number(((originalPrice * coupon.discountValue) / 100).toFixed(2));
      const maxDiscount = (coupon as any).maxDiscount;
      if (maxDiscount != null && discountAmount > maxDiscount) {
        discountAmount = Number(maxDiscount);
      }
    } else {
      discountAmount = Number(coupon.discountValue);
    }
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return apiSuccess({
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
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
