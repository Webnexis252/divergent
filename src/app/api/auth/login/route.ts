import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { getAuthCookieOptions, AUTH_COOKIE_NAME, signToken } from '@/lib/auth';
import { LoginSchema } from '@/lib/validators';
import {
  apiSuccess,
  apiError,
  apiUnauthorized,
  apiServerError,
} from '@/lib/api-response';
import { checkRateLimit, authLimiter } from '@/lib/rate-limit';
import { awardDailyLoginXp } from '@/lib/xp';

/**
 * POST /api/auth/login
 * Authenticate a user and set an httpOnly JWT cookie.
 * The token is NOT returned in the response body for security.
 */
export async function POST(req: NextRequest) {
  // Rate limiting: 10 attempts per minute per IP
  const { success: withinLimit } = await checkRateLimit(req, authLimiter);
  if (!withinLimit) {
    return apiError('Too many login attempts. Please try again later.', 429);
  }

  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Validation failed', 400, parsed.error.flatten());
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        mentorStatus: true,
      },
    });

    // Use consistent error message to prevent email enumeration attacks
    if (!user || !user.passwordHash) {
      return apiUnauthorized('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return apiUnauthorized('Invalid email or password');
    }

    // Block PENDING/SUSPENDED teachers — they must use the OTP login flow
    if (user.role === 'MENTOR' && user.mentorStatus === 'PENDING') {
      return apiError(
        'Your teacher account is pending admin approval. Please wait for your activation OTP email, then login at /teacher-login.',
        403
      );
    }
    if (user.role === 'MENTOR' && user.mentorStatus === 'SUSPENDED') {
      return apiError('Your teacher account has been suspended. Contact an admin.', 403);
    }

    await awardDailyLoginXp(user.id);

    const token = await signToken({
      userId: user.id,
      email: user.email!,
      role: user.role,
    });

    // Return only safe, non-sensitive user data. The token lives in the httpOnly cookie only.
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const response = apiSuccess({ user: safeUser }, 'Login successful');
    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
    return response;
  } catch (err) {
    console.error('[LOGIN_ERROR]', err);
    return apiServerError();
  }
}
