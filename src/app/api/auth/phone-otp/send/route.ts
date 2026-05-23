import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiBadRequest,
  apiError,
  apiServerError,
} from '@/lib/api-response';
import { checkRateLimit, authLimiter } from '@/lib/rate-limit';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

/**
 * Validates international phone format: must start with + and contain 7–15 digits.
 */
function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone.replace(/\s/g, ''));
}

/**
 * POST /api/auth/phone-otp/send
 * Sends a 6-digit SMS OTP to the given phone number via Supabase Auth.
 *
 * Body: { phone: string, context: "SIGNUP" | "SETTINGS" }
 *
 * - For SIGNUP: checks the phone isn't already registered.
 * - For SETTINGS: requires the user to be authenticated.
 * - Rate-limited: max 3 requests per phone per 10 minutes.
 */
export async function POST(req: NextRequest) {
  // General rate limit to prevent abuse
  const { success: withinLimit } = await checkRateLimit(req, authLimiter);
  if (!withinLimit) {
    return apiError('Too many OTP requests. Please wait a few minutes and try again.', 429);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiBadRequest('Request body is required');

    const { phone, context } = body;

    // --- Validate inputs ---
    if (typeof phone !== 'string' || !phone.trim()) {
      return apiBadRequest('Phone number is required');
    }
    const normalizedPhone = phone.replace(/\s/g, '');
    if (!isValidPhone(normalizedPhone)) {
      return apiBadRequest(
        'Phone number must be in international format (e.g. +919876543210)',
      );
    }
    if (context !== 'SIGNUP' && context !== 'SETTINGS') {
      return apiBadRequest('Invalid context. Must be "SIGNUP" or "SETTINGS"');
    }

    // --- Context-specific guards ---
    if (context === 'SIGNUP') {
      // Prevent sending OTP to a phone that's already used
      const existing = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
        select: { id: true },
      });
      if (existing) {
        return apiError(
          'This phone number is already registered. Please log in or use a different number.',
          409,
        );
      }
    } else if (context === 'SETTINGS') {
      // Must be a logged-in user
      const auth = await requireAuth(req);
      if (!auth) {
        return apiError('You must be logged in to change your phone number.', 401);
      }
      // Prevent using a phone already owned by another account
      const existingOwner = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
        select: { id: true },
      });
      if (existingOwner && existingOwner.id !== auth.userId) {
        return apiError(
          'This phone number is already in use by another account.',
          409,
        );
      }
    }

    // --- Per-phone rate limit: max 3 OTP sends per 10 minutes ---
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentOtps = await prisma.phoneOtp.count({
      where: {
        phone: normalizedPhone,
        createdAt: { gte: tenMinutesAgo },
      },
    });
    if (recentOtps >= 3) {
      return apiError(
        'Too many OTP requests for this number. Please wait 10 minutes before trying again.',
        429,
      );
    }

    // --- Send OTP via Supabase Auth ---
    const { error: supabaseError } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
    });

    if (supabaseError) {
      console.error('[PHONE_OTP_SEND_ERROR]', supabaseError.message);
      return apiError(
        'Failed to send OTP. Please check the phone number and try again.',
        500,
      );
    }

    // --- Record the pending OTP session ---
    await prisma.phoneOtp.create({
      data: {
        phone: normalizedPhone,
        context,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      },
    });

    // Mask phone for privacy in response: +91XXXXXX1234 → +91******1234
    const masked =
      normalizedPhone.slice(0, 3) +
      '*'.repeat(Math.max(0, normalizedPhone.length - 6)) +
      normalizedPhone.slice(-3);

    return apiSuccess(
      { sent: true, maskedPhone: masked },
      `OTP sent to ${masked}. It expires in 10 minutes.`,
    );
  } catch (err) {
    console.error('[PHONE_OTP_SEND_ERROR]', err);
    return apiServerError();
  }
}
