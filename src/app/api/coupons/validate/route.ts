import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { evaluateCoupon } from "@/lib/coupons";
import { apiError, apiSuccess } from "@/lib/api-response";

type EmiInstallment = { amount?: number | string };
type EmiPlan = { id?: string; installments: EmiInstallment[] };

/**
 * POST /api/coupons/validate
 * Previews a coupon for the course or bundle in the cart. Uses the same rules
 * as checkout (evaluateCoupon), so the price shown here is the price charged.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiError("Unauthorized", 401);

    const body = await req.json();
    const { code, courseId, bundleId, installmentIndex, planId } = body;
    if (!code || typeof code !== "string") {
      return apiError("Coupon code is required", 400);
    }
    if (!courseId && !bundleId) {
      return apiError("Course ID or Bundle ID is required", 400);
    }

    let originalPrice = 0;

    if (bundleId) {
      const bundle = await prisma.bundle.findUnique({
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

      const rawEmiPlans = course.emiPlans as unknown as Array<EmiPlan | EmiInstallment> | null;
      let emiPlans: EmiPlan[] | null = null;
      if (rawEmiPlans && rawEmiPlans.length > 0) {
        emiPlans =
          "installments" in rawEmiPlans[0]
            ? (rawEmiPlans as EmiPlan[])
            : [{ id: "legacy", installments: rawEmiPlans as EmiInstallment[] }];
      }

      if (typeof installmentIndex === "number" && emiPlans && emiPlans.length > 0) {
        const selectedPlan = planId ? emiPlans.find((p) => p.id === planId) : emiPlans[0];
        if (!selectedPlan) return apiError("Invalid plan selected", 400);

        if (installmentIndex < 0 || installmentIndex >= selectedPlan.installments.length) {
          return apiError("Invalid installment index", 400);
        }
        originalPrice = Number(selectedPlan.installments[installmentIndex].amount);
      } else {
        originalPrice = Number(course.price);
      }
    }

    const check = await evaluateCoupon(code, {
      userId: auth.userId,
      amount: originalPrice,
      targetId: courseId ?? bundleId,
      installmentIndex,
    });
    if (!check.ok) return apiError(check.error, check.status);

    return apiSuccess({
      discountType: check.discountType,
      discountValue: check.discountValue,
      code: check.code,
      originalPrice,
      discountAmount: check.discount,
      finalPrice: check.finalAmount,
    });
  } catch (error) {
    console.error("[VALIDATE COUPON]", error);
    return apiError("Failed to validate coupon", 500);
  }
}
