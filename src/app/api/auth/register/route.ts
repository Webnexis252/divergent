import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getAuthCookieOptions, AUTH_COOKIE_NAME, signToken } from '@/lib/auth';
import { RegisterSchema } from '@/lib/validators';
import { apiCreated, apiError, apiServerError } from '@/lib/api-response';
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

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError('An account with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, phone, passwordHash, role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await awardDailyLoginXp(user.id);

    const token = await signToken({
      userId: user.id,
      email: user.email!,
      role: user.role,
    });

    // Return only safe, non-sensitive user data. Token lives in the httpOnly cookie.
    const response = apiCreated({ user }, 'Account created successfully');
    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
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
