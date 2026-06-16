import { NextRequest } from "next/server";
import Razorpay from "razorpay";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { ensureActiveEnrollmentWithXp } from "@/lib/xp";

export async function POST(req: NextRequest) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error(
      "[CREATE ORDER] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set. " +
      "Add these to Vercel Environment Variables (Settings → Environment Variables)."
    );
    return apiError("Razorpay is not configured. Please contact support.", 503);
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const auth = await requireAuth(req);
    if (!auth) return apiError("Unauthorized", 401);

    const body = await req.json();
    const { courseId, bundleId, installmentIndex, couponCode } = body;

    if (!courseId && !bundleId) {
      return apiError('Course ID or Bundle ID is required', 400);
    }
    if (courseId && bundleId) {
      return apiError('Provide either courseId or bundleId, not both', 400);
    }

    let orderAmount: number;
    let paymentData: { userId: string; courseId?: string; bundleId?: string; amount: number; currency: string; status: 'PENDING'; paymentGateway: string; installmentIndex?: number };

    if (bundleId) {
      // --- Bundle purchase flow ---
      const bundle = await prisma.bundle.findUnique({
        where: { id: bundleId },
        select: { id: true, price: true, title: true, isPublished: true },
      });
      if (!bundle || !bundle.isPublished) {
        return apiError('Bundle not found or not available', 404);
      }
      if (bundle.price <= 0) {
        return apiError('Bundle is free, use direct enrollment', 400);
      }
      orderAmount = bundle.price;
      paymentData = { userId: auth.userId, bundleId, amount: bundle.price, currency: 'INR', status: 'PENDING', paymentGateway: 'RAZORPAY' };
    } else {
      // --- Single course purchase flow ---
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, price: true, title: true, emiPlans: true },
      });
      if (!course) {
        return apiError('Course not found', 404);
      }

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
      let selectedPlan: any = null;

      if (isInstallment) {
        selectedPlan = body.planId ? emiPlans!.find(p => p.id === body.planId) : emiPlans![0];
        if (!selectedPlan) {
          return apiError('Invalid plan selected', 400);
        }
        if (installmentIndex < 0 || installmentIndex >= selectedPlan.installments.length) {
          return apiError('Invalid installment index', 400);
        }
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: auth.userId, courseId } },
      });

      if (existingEnrollment) {
        if (!existingEnrollment.isInstallmentBased || existingEnrollment.validUntil === null) {
          return apiError('Already enrolled', 409);
        }
        if (isInstallment && installmentIndex !== existingEnrollment.currentInstallment) {
          return apiError('Invalid next installment sequence', 400);
        }
      }

      if (isInstallment) {
        const plan = selectedPlan;
        orderAmount = Number(plan.installments[installmentIndex].amount);
        paymentData = { userId: auth.userId, courseId, amount: orderAmount, currency: 'INR', status: 'PENDING', paymentGateway: 'RAZORPAY', installmentIndex };
        // Store planId in notes
        (paymentData as any).notes = JSON.stringify({ planId: plan.id });
      } else {
        if (course.price <= 0) {
          return apiError('Course is free, use normal enrollment', 400);
        }
        orderAmount = course.price;
        paymentData = { userId: auth.userId, courseId, amount: course.price, currency: 'INR', status: 'PENDING', paymentGateway: 'RAZORPAY' };
      }
    }

    // Check if payment is bypassed globally
    const settings = await prisma.instituteSettings.findFirst();
    let isBypassed = settings && settings.requirePayment === false;

    // Apply Coupon Logic
    let appliedCouponDiscount = 0;
    let appliedCouponCode = null;

    if (couponCode && !isBypassed) {
      if (typeof installmentIndex === "number" && installmentIndex > 0) {
        return apiError("Coupons cannot be applied to subsequent installments", 400);
      }

      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });

      if (coupon && coupon.isActive && (!coupon.validUntil || new Date(coupon.validUntil) >= new Date()) && (!coupon.startDate || new Date(coupon.startDate) <= new Date()) && coupon.usedCount < coupon.maxUses) {
        if (coupon.minPurchase && orderAmount < coupon.minPurchase) {
          return apiError(`Minimum purchase amount for this coupon is ${coupon.minPurchase}`, 400);
        }

        // @ts-ignore
        if (coupon.targetUsers === "FIRST_TIME" || coupon.targetUsers === "RENEWING") {
          const successfulPaymentsCount = await prisma.payment.count({
            where: {
              userId: auth.userId,
              status: "SUCCESS"
            }
          });
          
          // @ts-ignore
          if (coupon.targetUsers === "FIRST_TIME" && successfulPaymentsCount > 0) {
            return apiError("This coupon is only valid for first-time purchasers.", 400);
          }
          // @ts-ignore
          if (coupon.targetUsers === "RENEWING" && successfulPaymentsCount === 0) {
            return apiError("This coupon is only valid for renewing users (users with prior purchases).", 400);
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

        if (coupon.discountType === "PERCENTAGE") {
          appliedCouponDiscount = Number(((orderAmount * coupon.discountValue) / 100).toFixed(2));
        } else {
          appliedCouponDiscount = Number(coupon.discountValue);
        }

        orderAmount = Math.max(0, orderAmount - appliedCouponDiscount);
        appliedCouponCode = coupon.code;
        
        if (orderAmount === 0) {
          isBypassed = true;
        }
      } else {
        return apiError("Invalid, expired, or fully used coupon code", 400);
      }
    }

    if (isBypassed) {
      if (bundleId) {
        const bundleCourses = await prisma.bundleCourse.findMany({
          where: { bundleId },
          select: { courseId: true },
        });
        await Promise.all(bundleCourses.map(bc => ensureActiveEnrollmentWithXp(auth.userId, bc.courseId, 'ACTIVE', true, bundleId)));
      } else {
        await ensureActiveEnrollmentWithXp(auth.userId, courseId);
      }

      // Record the 0 INR payment if bypass was due to coupon
      if (appliedCouponCode) {
        await prisma.payment.create({
          data: {
            ...paymentData,
            amount: 0,
            status: "SUCCESS",
            razorpayOrderId: `free_${auth.userId.substring(0,8)}_${Date.now()}`,
            couponCode: appliedCouponCode,
            discountAmount: appliedCouponDiscount,
          }
        });
        await prisma.coupon.update({
          where: { code: appliedCouponCode },
          data: { usedCount: { increment: 1 } }
        });
      }

      return apiSuccess({ bypassPayment: true });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!user) {
      return apiError("User not found", 404);
    }

    const options = {
      amount: Math.round(orderAmount * 100), // Razorpay requires amount in paise
      currency: "INR",
      receipt: `rcpt_${auth.userId.substring(0, 8)}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order || !order.id) {
      throw new Error("Failed to create Razorpay order");
    }

    // Create a pending payment record
    await prisma.payment.create({
      data: {
        ...paymentData,
        amount: orderAmount,
        razorpayOrderId: order.id,
        ...(appliedCouponCode && {
          couponCode: appliedCouponCode,
          discountAmount: appliedCouponDiscount
        })
      },
    });

    return apiSuccess({
      order_id: order.id,
      amount: options.amount,
      currency: options.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      user_name: user.name || 'Student',
      user_email: user.email || 'student@divergentclasses.in',
      user_phone: user.phone || '9999999999',
    });
  } catch (error: unknown) {
    console.error("[RAZORPAY CREATE ORDER] Unexpected error:", error);
    return apiError("Something went wrong while processing your payment. Please try again.", 500);
  }
}
