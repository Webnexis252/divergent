import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { apiCreated, apiError, apiServerError } from "@/lib/api-response";
import { checkRateLimit, authLimiter } from "@/lib/rate-limit";

import { verifyPhoneVerifiedToken } from "@/lib/auth";

/**
 * POST /api/auth/register/teacher
 * Teacher self-registration — creates a PENDING MENTOR account.
 * Does NOT set a session cookie. Teacher must wait for admin OTP activation.
 */
export async function POST(req: NextRequest) {
  const { success: withinLimit } = await checkRateLimit(req, authLimiter);
  if (!withinLimit) {
    return apiError("Too many registration attempts. Please try again later.", 429);
  }

  try {
    const body = await req.json();
    const { name, email, password, phone, phoneVerifiedToken } = body as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      phoneVerifiedToken?: string;
    };

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return apiError("Name, email, and password are required", 400);
    }
    if (name.trim().length < 2) return apiError("Name must be at least 2 characters", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return apiError("Invalid email address", 400);
    if (password.length < 8) return apiError("Password must be at least 8 characters", 400);
    if (!/[A-Z]/.test(password)) return apiError("Password must contain at least one uppercase letter", 400);
    if (!/[0-9]/.test(password)) return apiError("Password must contain at least one number", 400);

    if (phone?.trim()) {
      if (!phoneVerifiedToken || typeof phoneVerifiedToken !== 'string') {
        return apiError(
          'Phone number must be verified via OTP before creating your account.',
          400,
        );
      }
      const verifiedPhone = await verifyPhoneVerifiedToken(phoneVerifiedToken);
      if (!verifiedPhone) {
        return apiError(
          'Phone verification token is invalid or has expired. Please verify your phone number again.',
          400,
        );
      }
      const normalizedPhone = phone.replace(/\s/g, '');
      if (verifiedPhone.phone !== normalizedPhone) {
        return apiError(
          'Phone number does not match the verified number. Please re-verify.',
          400,
        );
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return apiError("An account with this email already exists", 409);

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        passwordHash,
        role: "MENTOR",
        mentorStatus: "PENDING",
      },
    });

    // No session cookie — admin must activate via OTP first
    return apiCreated(
      { status: "pending" },
      "Registration received! Your account is pending admin approval. You will receive an activation OTP once approved."
    );
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === "P2002") return apiError("A user with these details already exists.", 409);
    console.error("[TEACHER_REGISTER_ERROR]", error.message);
    return apiServerError();
  }
}
