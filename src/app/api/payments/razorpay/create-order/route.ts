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
    const { courseId, bundleId } = body;

    if (!courseId && !bundleId) {
      return apiError('Course ID or Bundle ID is required', 400);
    }
    if (courseId && bundleId) {
      return apiError('Provide either courseId or bundleId, not both', 400);
    }

    let orderAmount: number;
    let paymentData: { userId: string; courseId?: string; bundleId?: string; amount: number; currency: string; status: 'PENDING'; paymentGateway: string };

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
      paymentData = { userId: auth.userId, courseId, amount: course.price, currency: 'INR', status: 'PENDING', paymentGateway: 'RAZORPAY' };
    }

    // Check if payment is bypassed globally
    const settings = await prisma.instituteSettings.findFirst();
    if (settings && settings.requirePayment === false) {
      if (bundleId) {
        const bundleCourses = await prisma.bundleCourse.findMany({
          where: { bundleId },
          select: { courseId: true },
        });
        await Promise.all(bundleCourses.map(bc => ensureActiveEnrollmentWithXp(auth.userId, bc.courseId, 'ACTIVE', true, bundleId)));
      } else {
        await ensureActiveEnrollmentWithXp(auth.userId, courseId);
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
        razorpayOrderId: order.id,
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
