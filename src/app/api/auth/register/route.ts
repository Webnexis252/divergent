import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signMagicLinkToken, verifyPhoneVerifiedToken } from '@/lib/auth';
import { RegisterSchema } from '@/lib/validators';
import { apiError, apiServerError, apiSuccess } from '@/lib/api-response';
import { sendStudentMagicLinkEmail } from '@/lib/email';
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

  let magicLinkForErrorLog = '';

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

    // Instead of creating the user immediately, sign a magic link token
    const magicToken = await signMagicLinkToken({
      name,
      email,
      phone,
      passwordHash,
    });

    // Send the email with the magic link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const magicLink = `${baseUrl}/api/auth/verify-magic-link?token=${magicToken}`;
    magicLinkForErrorLog = magicLink;

    await sendStudentMagicLinkEmail({ to: email, name, magicLink });

    // Return success message. Do NOT log the user in yet.
    return apiSuccess(
      { magicLinkSent: true },
      'Registration link sent! Please check your email to complete signup.',
      200
    );
  } catch (err: unknown) {
    const error = err as {
      code?: string;
      message?: string;
    };

    console.error('[REGISTER_ERROR]', { message: error.message, code: error.code });

    if (error.code === 'P2002') {
      return apiError('A user with these details already exists.', 409);
    }
    
    // Handle SMTP auth errors gracefully
    if (error.code === 'EAUTH' || error.message?.includes('Invalid login')) {
      console.log('\n=========================================================');
      console.log('⚠️ SMTP Configuration Error: Could not send magic link email.');
      console.log('Since you are in development, you can use this link directly:');
      console.log(magicLinkForErrorLog);
      console.log('=========================================================\n');
      
      if (process.env.NODE_ENV === 'development') {
        // In dev, pretend it succeeded so the developer can click the link in the terminal
        return apiSuccess(
          { magicLinkSent: true },
          'Registration link logged to terminal! (SMTP configuration error)',
          200
        );
      }
      
      return apiError(
        'Email configuration error. Please contact support or check SMTP settings.', 
        500
      );
    }

    return apiServerError(
      process.env.NODE_ENV === 'development' ? error.message : undefined,
    );
  }
}
