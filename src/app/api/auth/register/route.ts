import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { verifyPhoneVerifiedToken, signToken, AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/lib/auth';
import { RegisterSchema } from '@/lib/validators';
import { apiError, apiServerError } from '@/lib/api-response';
import { checkRateLimit, authLimiter } from '@/lib/rate-limit';
import { awardDailyLoginXp } from '@/lib/xp';

/**
 * POST /api/auth/register
 * Register a new STUDENT account only.
 * Mentor/Admin accounts must be created by a Super Admin via the admin dashboard.
 */
export async function POST(req: NextRequest) {
  // Rate limiting: 10 registration attempts per minute per IP
  const { success: withinLimit } = await checkRateLimit(req, authLimiter);
  if (!withinLimit) {
    return apiError('Too many registration attempts. Please try again later.', 429);
  }

  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Validation failed', 400, parsed.error.flatten());
    }

    // Force role to STUDENT regardless of what the client sends.
    // Mentor/Admin accounts can only be created by Super Admins.
    const { name, email, password, phone } = parsed.data;
    const role = 'STUDENT' as const;

    // --- Phone verification check ---
    // If the student provided a phone number, they must have verified it via OTP first.
    if (phone) {
      const rawPhoneVerifiedToken = body.phoneVerifiedToken;
      if (!rawPhoneVerifiedToken || typeof rawPhoneVerifiedToken !== 'string') {
        return apiError(
          'Phone number must be verified via OTP before creating your account.',
          400,
        );
      }
      const verifiedPhone = await verifyPhoneVerifiedToken(rawPhoneVerifiedToken);
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

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError('An account with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create the new user directly
    const user = await prisma.user.create({
      data: { name, email, phone, passwordHash, role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await awardDailyLoginXp(user.id);

    // Sign auth token
    const authToken = await signToken({
      userId: user.id,
      email: user.email!,
      role: user.role,
    });

    // We can't set cookies easily using apiSuccess (which returns a Response),
    // so we construct a NextResponse manually.
    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully!',
      data: { user },
    }, { status: 201 });

    response.cookies.set(AUTH_COOKIE_NAME, authToken, getAuthCookieOptions());
    return response;

  } catch (err: unknown) {
    const error = err as {
      code?: string;
      message?: string;
    };

    console.error('[REGISTER_ERROR]', { message: error.message, code: error.code });

    if (error.code === 'P2002') {
      return apiError('A user with these details already exists.', 409);
    }

    return apiServerError(
      process.env.NODE_ENV === 'development' ? error.message : undefined,
    );
  }
}
