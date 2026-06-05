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
    const { courseId } = body;

    if (!courseId) {
      return apiError("Course ID is required", 400);
    }

    // Fetch the course to get pricing
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, price: true, title: true },
    });

    if (!course) {
      return apiError("Course not found", 404);
    }

    if (course.price <= 0) {
      return apiError("Course is free, use normal enrollment", 400);
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: auth.userId, courseId } },
    });

    if (existingEnrollment) {
      return apiError("Already enrolled", 409);
    }

    // Check if payment is bypassed globally
    const settings = await prisma.instituteSettings.findFirst();
    if (settings && settings.requirePayment === false) {
      await ensureActiveEnrollmentWithXp(auth.userId, courseId);
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
      order_amount: course.price,
      order_currency: "INR",
      order_id: orderId,
      customer_details: {
        customer_id: auth.userId,
        customer_name: user.name || "Student",
        customer_email: user.email || "student@divergentclasses.in",
        customer_phone: user.phone || "9999999999",
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/callback?order_id={order_id}`,
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/payments/webhook`,
      },
      order_note: `Enrollment for: ${course.title}`,
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
        userId: auth.userId,
        courseId,
        amount: course.price,
        currency: "INR",
        status: "PENDING",
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
