import { NextRequest } from 'next/server';
import * as bcrypt from '@node-rs/bcrypt';
import prisma from '@/lib/prisma';
import { requireAuth, signPhoneVerifiedToken } from '@/lib/auth';
import { recordRegisteredInBackground } from '@/lib/auth-bloom';
import {
  apiSuccess,
  apiBadRequest,
  apiError,
  apiUnauthorized,
  apiServerError,
} from '@/lib/api-response';
import { checkRateLimit, authLimiter } from '@/lib/rate-limit';

/** Wrong guesses allowed per code; with 3 codes per phone per 10 minutes, that's at most 15 guesses. */
const MAX_OTP_ATTEMPTS = 5;

/**
 * POST /api/auth/phone-otp/verify
 * Verifies the OTP entered by the user against the bcrypt hash stored in DB.
 *
 * Body: { phone: string, otp: string, context: "SIGNUP" | "SETTINGS" }
 *
 * On success:
 *   - SIGNUP: returns a signed `phoneVerifiedToken` (15-min JWT) for the signup form.
 *   - SETTINGS: updates user.phone in the database directly.
 *
 * Each code allows MAX_OTP_ATTEMPTS wrong guesses, counted in the database so
 * the limit holds across serverless instances; requests are also rate-limited per IP.
 */
export async function POST(req: NextRequest) {
  try {
    const { success: withinLimit } = await checkRateLimit(req, authLimiter);
    if (!withinLimit) {
      return apiError('Too many attempts. Please wait a minute and try again.', 429);
    }
  } catch (rateLimitErr) {
    // The per-code attempt limit below still applies if Redis is down
    console.error('[PHONE_OTP_VERIFY] Rate limit check failed:', rateLimitErr);
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiBadRequest('Request body is required');

    const { phone, otp, context } = body;

    // --- Validate inputs ---
    if (typeof phone !== 'string' || !phone.trim()) {
      return apiBadRequest('Phone number is required');
    }
    const normalizedPhone = phone.replace(/[\s\-()]/g, '');

    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return apiBadRequest('OTP must be a 6-digit number');
    }
    if (context !== 'SIGNUP' && context !== 'SETTINGS') {
      return apiBadRequest('Invalid context. Must be "SIGNUP" or "SETTINGS"');
    }

    // --- Fetch the most recent valid pending OTP session ---
    const pendingOtp = await prisma.phoneOtp.findFirst({
      where: {
        phone: normalizedPhone,
        context,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!pendingOtp) {
      return apiError(
        'OTP session not found or has expired. Please request a new OTP.',
        400,
      );
    }

    // --- Count this guess before checking it ---
    // Claimed atomically, so parallel requests can't get more than MAX_OTP_ATTEMPTS
    // guesses at one code. A used-up code is left in place (not deleted) until it
    // expires, so guesses can't fall through to an older code for the same phone.
    const claimed = await prisma.phoneOtp.updateMany({
      where: { id: pendingOtp.id, attempts: { lt: MAX_OTP_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count === 0) {
      return apiError('Too many incorrect attempts. Please request a new OTP.', 429);
    }

    // --- Verify OTP against stored bcrypt hash ---
    const isValid = await bcrypt.compare(otp, pendingOtp.otpHash);

    if (!isValid) {
      const attemptsLeft = MAX_OTP_ATTEMPTS - (pendingOtp.attempts + 1);
      return attemptsLeft > 0
        ? apiError(
            `Invalid OTP. ${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`,
            400,
          )
        : apiError('Too many incorrect attempts. Please request a new OTP.', 429);
    }

    // --- Cleanup: delete the used OTP record ---
    await prisma.phoneOtp.delete({ where: { id: pendingOtp.id } }).catch((deleteErr) => {
      // Non-critical: log but don't fail the verification
      console.warn('[PHONE_OTP_VERIFY] Failed to delete used OTP record:', deleteErr);
    });

    // --- Also clean up any other expired OTP records for this phone ---
    await prisma.phoneOtp.deleteMany({
      where: {
        phone: normalizedPhone,
        expiresAt: { lt: new Date() },
      },
    }).catch(() => {});

    // --- Handle each context ---
    if (context === 'SIGNUP') {
      // Issue a short-lived phone-verified JWT the signup form will include with the register request
      const phoneVerifiedToken = await signPhoneVerifiedToken(normalizedPhone);
      return apiSuccess(
        { verified: true, phoneVerifiedToken },
        'Phone number verified successfully.',
      );
    }

    if (context === 'SETTINGS') {
      // Must be logged in
      const auth = await requireAuth(req);
      if (!auth) return apiUnauthorized();

      // Check if another user already has this phone number
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

      // Update the user's phone in the DB
      await prisma.user.update({
        where: { id: auth.userId },
        data: { phone: normalizedPhone },
      });
      recordRegisteredInBackground({ phone: normalizedPhone });

      return apiSuccess(
        { verified: true },
        'Phone number updated successfully.',
      );
    }

    return apiServerError();
  } catch (err) {
    console.error('[PHONE_OTP_VERIFY_ERROR]', err);
    return apiServerError();
  }
}
