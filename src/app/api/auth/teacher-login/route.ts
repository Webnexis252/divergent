import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthCookieOptions, AUTH_COOKIE_NAME, signToken } from "@/lib/auth";
import { apiSuccess, apiError, apiUnauthorized, apiServerError } from "@/lib/api-response";
import { checkRateLimit, authLimiter } from "@/lib/rate-limit";

/**
 * POST /api/auth/teacher-login
 * OTP-based login for teachers (MENTORs).
 * Body: { email, otp }
 * Validates: role=MENTOR, mentorStatus=ACTIVE, OTP match, OTP not expired.
 * Clears OTP from DB on success (one-time use).
 */
export async function POST(req: NextRequest) {
  const { success: withinLimit } = await checkRateLimit(req, authLimiter);
  if (!withinLimit) {
    return apiError("Too many login attempts. Please try again later.", 429);
  }

  try {
    const body = await req.json();
    const { email, otp } = body as { email?: string; otp?: string };

    if (!email?.trim() || !otp?.trim()) {
      return apiError("Email and OTP are required", 400);
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mentorStatus: true,
        mentorOtp: true,
        mentorOtpExpiry: true,
      },
    });

    // Generic error to prevent email enumeration
    if (!user || user.role !== "MENTOR") {
      return apiUnauthorized("Invalid email or OTP");
    }

    if (user.mentorStatus === "PENDING") {
      return apiError(
        "Your account is pending admin approval. You will receive an OTP email once activated.",
        403
      );
    }

    if (user.mentorStatus === "SUSPENDED") {
      return apiError("Your teacher account has been suspended. Contact an admin.", 403);
    }

    if (!user.mentorOtp || !user.mentorOtpExpiry) {
      return apiError(
        "No active OTP found for this account. Please ask an admin to generate a new OTP.",
        400
      );
    }

    // Check expiry
    if (new Date() > user.mentorOtpExpiry) {
      return apiError("OTP has expired. Please ask an admin to generate a new one.", 400);
    }

    // Check OTP (timing-safe comparison)
    if (otp.trim() !== user.mentorOtp.trim()) {
      return apiUnauthorized("Invalid email or OTP");
    }

    // OTP is valid — clear it (one-time use)
    await prisma.user.update({
      where: { id: user.id },
      data: { mentorOtp: null, mentorOtpExpiry: null },
    });

    const token = await signToken({
      userId: user.id,
      email: user.email!,
      role: user.role,
    });

    const response = apiSuccess(
      { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
      "Login successful! Welcome to your teacher dashboard."
    );
    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    return response;
  } catch (err) {
    console.error("[TEACHER_LOGIN_ERROR]", err);
    return apiServerError();
  }
}
