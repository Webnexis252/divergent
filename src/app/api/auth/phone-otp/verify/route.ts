import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { requireAuth, signPhoneVerifiedToken } from '@/lib/auth';
import {
  apiSuccess,
  apiBadRequest,
  apiError,
  apiUnauthorized,
  apiServerError,
} from '@/lib/api-response';

/**
 * POST /api/auth/phone-otp/verify
 * Verifies the OTP entered by the user against the bcrypt hash stored in DB.
 *
 * Body: { phone: string, otp: string, context: "SIGNUP" | "SETTINGS" }
 *
 * On success:
 *   - SIGNUP: returns a signed `phoneVerifiedToken` (15-min JWT) for the signup form.
 *   - SETTINGS: updates user.phone in the database directly.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return apiBadRequest('Request body is required');

    const { phone, otp, context } = body;

    // --- Validate inputs ---
    if (typeof phone !== 'string' || !phone.trim()) {
      return apiBadRequest('Phone number is required');
    }
    const normalizedPhone = phone.replace(/\s/g, '');

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

    // --- Verify OTP against stored bcrypt hash ---
    const isValid = await bcrypt.compare(otp, pendingOtp.otpHash);

    if (!isValid) {
      return apiError('Invalid OTP. Please check the code and try again.', 400);
    }

    // --- Cleanup: delete the used OTP record ---
    await prisma.phoneOtp.delete({ where: { id: pendingOtp.id } }).catch(() => {});

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

      // Update the user's phone in the DB
      await prisma.user.update({
        where: { id: auth.userId },
        data: { phone: normalizedPhone },
      });

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
