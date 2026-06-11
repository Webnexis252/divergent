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
    const { courseId, bundleId } = body;

    if (!courseId && !bundleId) {
      return apiError('Course ID or Bundle ID is required', 400);
    }
    if (courseId && bundleId) {
      return apiError('Provide either courseId or bundleId, not both', 400);
    }

    let orderAmount: number;
    let orderNote: string;
    let paymentData: { userId: string; courseId?: string; bundleId?: string; amount: number; currency: string; status: 'PENDING'; cashfreeOrderId: string };

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
        select: { id: true, price: true, title: true },
      });
      if (!course) {
        return apiError('Course not found', 404);
      }
      if (course.price <= 0) {
        return apiError('Course is free, use normal enrollment', 400);
      }
      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: auth.userId, courseId } },
      });
      if (existingEnrollment) {
        return apiError('Already enrolled', 409);
      }
      orderAmount = course.price;
      orderNote = `Enrollment for: ${course.title}`;
      paymentData = { userId: auth.userId, courseId, amount: course.price, currency: 'INR', status: 'PENDING', cashfreeOrderId: '' };
    }

    // Check if payment is bypassed globally
    const settings = await prisma.instituteSettings.findFirst();
    if (settings && settings.requirePayment === false) {
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
        cashfreeOrderId: cfOrder.order_id || orderId,
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
    return apiError("Something went wrong while processing your payment. Please try again.", 500);
  }
}
