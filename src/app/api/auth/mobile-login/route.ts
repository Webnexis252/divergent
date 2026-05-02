import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { LoginSchema } from '@/lib/validators';
import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-response';
import { checkRateLimit, authLimiter } from '@/lib/rate-limit';
import { awardDailyLoginXp } from '@/lib/xp';

/**
 * POST /api/auth/mobile-login
 * Mobile-specific login endpoint.
 * Unlike the web login, returns the JWT in the response body (not cookie)
 * so React Native apps can store it in SecureStore.
 * The token can then be sent as: Authorization: Bearer <token>
 */
export async function POST(req: NextRequest) {
  // Only allow requests that identify as mobile clients
  const clientType = req.headers.get('x-client-type');
  if (clientType !== 'mobile') {
    return apiError('This endpoint is for mobile clients only.', 403);
  }

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
        profileImage: true,
      },
    });

    if (!user || !user.passwordHash) {
      return apiUnauthorized('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return apiUnauthorized('Invalid email or password');
    }

    // Role-based app gating
    const appType = req.headers.get('x-app-type'); // 'student' | 'staff'
    if (appType === 'student' && user.role !== 'STUDENT') {
      return apiError('Please use the Divergent Manage app to sign in as staff.', 403);
    }
    if (appType === 'staff' && user.role === 'STUDENT') {
      return apiError('Students must use the Divergent Learn app.', 403);
    }

    // Block pending/suspended mentors
    if (user.role === 'MENTOR' && user.mentorStatus === 'PENDING') {
      return apiError('Your teacher account is pending admin approval.', 403);
    }
    if (user.role === 'MENTOR' && user.mentorStatus === 'SUSPENDED') {
      return apiError('Your teacher account has been suspended.', 403);
    }

    await awardDailyLoginXp(user.id);

    const token = await signToken({
      userId: user.id,
      email: user.email!,
      role: user.role,
    });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
    };

    // Return token in body — mobile client stores in SecureStore
    return apiSuccess({ user: safeUser, token }, 'Login successful');
  } catch (err) {
    console.error('[MOBILE_LOGIN_ERROR]', err);
    return apiServerError();
  }
}
