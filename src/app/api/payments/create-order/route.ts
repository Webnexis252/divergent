import { NextResponse, NextRequest } from "next/server";
import cashfree from "@/lib/cashfree";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { ensureActiveEnrollmentWithXp } from "@/lib/xp";

export async function POST(req: NextRequest) {
  // Guard: Catch missing Cashfree credentials early and return a clear,
  // actionable error rather than letting Cashfree return a cryptic 400.
  if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
    console.error(
      "[CREATE ORDER] CASHFREE_APP_ID or CASHFREE_SECRET_KEY is not set. " +
      "Add these to Vercel Environment Variables (Settings → Environment Variables)."
    );
    return apiError("Payment service is not configured. Please contact support.", 503);
  }

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
    let orderNote: string;
    let paymentData: { userId: string; courseId?: string; bundleId?: string; amount: number; currency: string; status: 'PENDING'; cashfreeOrderId: string; installmentIndex?: number };

    if (bundleId) {
      // --- Bundle purchase flow ---
      const bundle = await (prisma as any).bundle.findUnique({
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
      orderNote = `Bundle purchase: ${bundle.title}`;
      paymentData = { userId: auth.userId, bundleId, amount: bundle.price, currency: 'INR', status: 'PENDING', cashfreeOrderId: '' };
    } else {
      // --- Single course purchase flow ---
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, price: true, title: true, emiPlans: true },
      });
      if (!course) {
        return apiError('Course not found', 404);
      }
      
      const emiPlans = course.emiPlans as any[] | null;
      const isInstallment = typeof installmentIndex === 'number' && emiPlans && emiPlans.length > 0;
      
      if (isInstallment && (installmentIndex < 0 || installmentIndex >= emiPlans!.length)) {
        return apiError('Invalid installment index', 400);
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
        const plan = emiPlans![installmentIndex];
        orderAmount = Number(plan.amount);
        orderNote = `Installment ${installmentIndex + 1} for: ${course.title}`;
        paymentData = { userId: auth.userId, courseId, amount: Number(plan.amount), currency: 'INR', status: 'PENDING', cashfreeOrderId: '', installmentIndex };
      } else {
        if (Number(course.price) <= 0) {
          return apiError('Course is free, use normal enrollment', 400);
        }
        orderAmount = Number(course.price);
        orderNote = `Enrollment for: ${course.title}`;
        paymentData = { userId: auth.userId, courseId, amount: Number(course.price), currency: 'INR', status: 'PENDING', cashfreeOrderId: '' };
      }
    }

    // Check if payment is bypassed globally
    const settings = await prisma.instituteSettings.findFirst();
    let isBypassed = settings && settings.requirePayment === false;

    // Apply Coupon Logic
    let appliedCouponDiscount = 0;
    let appliedCouponCode = null;

    if (couponCode && !isBypassed) {
      // Don't allow coupon if it's an installment > 0
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
          const maxDiscount = (coupon as any).maxDiscount;
          if (maxDiscount != null && appliedCouponDiscount > maxDiscount) {
            appliedCouponDiscount = Number(maxDiscount);
          }
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
        // Enroll student in all courses of the bundle
        const bundleCourses = await (prisma as any).bundleCourse.findMany({
          where: { bundleId },
          select: { courseId: true },
        });
        await Promise.all(bundleCourses.map((bc: { courseId: string }) => ensureActiveEnrollmentWithXp(auth.userId, bc.courseId, 'ACTIVE', true, bundleId)));
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
            cashfreeOrderId: `free_${auth.userId.substring(0,8)}_${Date.now()}`,
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

    // Fetch user details for Cashfree customer info
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!user) {
      return apiError("User not found", 404);
    }

    // Generate a unique order ID
    const orderId = `order_${auth.userId.substring(0, 8)}_${Date.now()}`;

    // Create Cashfree order
    const orderRequest = {
      order_amount: orderAmount,
      order_currency: 'INR',
      order_id: orderId,
      customer_details: {
        customer_id: auth.userId,
        customer_name: user.name || 'Student',
        customer_email: user.email || 'student@divergentclasses.in',
        customer_phone: user.phone || '9999999999',
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payments/callback?order_id={order_id}`,
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payments/webhook`,
      },
      order_note: orderNote,
    };

    const response = await cashfree.PGCreateOrder(orderRequest);

    console.log("Cashfree PGCreateOrder response:", JSON.stringify(response?.data, null, 2));

    if (!response?.data) {
      throw new Error("Failed to create Cashfree order - empty response");
    }

    const cfOrder = response.data;

    if (!cfOrder.payment_session_id) {
      throw new Error(`Cashfree order created but no payment_session_id. Order status: ${cfOrder.order_status}`);
    }

    // Create a pending payment record
    await prisma.payment.create({
      data: {
        ...paymentData,
        amount: orderAmount,
        cashfreeOrderId: cfOrder.order_id || orderId,
        ...(appliedCouponCode && {
          couponCode: appliedCouponCode,
          discountAmount: appliedCouponDiscount
        })
      },
    });

    // Return the environment so the client always opens the correct
    // Cashfree SDK (production vs sandbox) regardless of NEXT_PUBLIC_ vars.
    const cashfreeEnvironment =
      process.env.CASHFREE_ENVIRONMENT === "PRODUCTION" ? "production" : "sandbox";

    return apiSuccess({
      order_id: cfOrder.order_id,
      payment_session_id: cfOrder.payment_session_id,
      order_status: cfOrder.order_status,
      cashfree_environment: cashfreeEnvironment,
    });
  } catch (error: unknown) {
    // Log the full Cashfree API error server-side, but return a generic
    // user-facing message so we don't leak internal details.
    if (error && typeof error === "object" && "response" in error) {
      const axiosErr = error as { response?: { data?: unknown; status?: number } };
      const cfStatus = axiosErr.response?.status;
      const cfData = axiosErr.response?.data;
      console.error(
        "[CREATE ORDER] Cashfree API Error",
        JSON.stringify({ status: cfStatus, data: cfData })
      );
      // Surface specific Cashfree errors only in development
      if (process.env.NODE_ENV === "development") {
        const cfMsg = (cfData as { message?: string })?.message;
        return apiError(cfMsg ?? "Payment gateway error", 500);
      }
      return apiError("Could not connect to payment gateway. Please try again or contact support.", 502);
    }
    console.error("[CREATE ORDER] Unexpected error:", error);
    return apiError(error instanceof Error ? error.message : "Something went wrong while processing your payment. Please try again.", 500);
  }
}
