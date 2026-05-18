import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthCookieOptions, AUTH_COOKIE_NAME, signToken, verifyMagicLinkTokenValue } from '@/lib/auth';
import { awardDailyLoginXp } from '@/lib/xp';

/**
 * GET /api/auth/verify-magic-link
 * Verifies the magic link token, creates the user account, sets the auth cookie, and redirects to dashboard.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/signup?error=missing_token`);
  }

  const payload = await verifyMagicLinkTokenValue(token);
  if (!payload) {
    return NextResponse.redirect(`${baseUrl}/signup?error=invalid_token`);
  }

  try {
    const { name, email, phone, passwordHash } = payload;
    const role = 'STUDENT';

    // Check if the user already exists (in case they clicked it twice)
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // If user exists, just log them in
      const authToken = await signToken({
        userId: existing.id,
        email: existing.email!,
        role: existing.role,
      });

      const response = NextResponse.redirect(`${baseUrl}/dashboard`);
      response.cookies.set(AUTH_COOKIE_NAME, authToken, getAuthCookieOptions());
      return response;
    }

    // Create the new user
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

    // Redirect to dashboard with auth cookie set
    const response = NextResponse.redirect(`${baseUrl}/dashboard`);
    response.cookies.set(AUTH_COOKIE_NAME, authToken, getAuthCookieOptions());
    return response;

  } catch (error) {
    console.error('[VERIFY_MAGIC_LINK_ERROR]', error);
    return NextResponse.redirect(`${baseUrl}/signup?error=server_error`);
  }
}
