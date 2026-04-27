import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signToken, AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { awardDailyLoginXp } from '@/lib/xp';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const loginUrl = new URL('/login', req.url);

  if (error) {
    loginUrl.searchParams.set('error', 'Google authentication was cancelled or failed.');
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    loginUrl.searchParams.set('error', 'No authorization code received.');
    return NextResponse.redirect(loginUrl);
  }

  // Enforce credentials exist
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    loginUrl.searchParams.set('error', 'Server configuration missing (Google OAuth).');
    return NextResponse.redirect(loginUrl);
  }

  // Decode State
  let action = 'login';
  // Force STUDENT for all OAuth registrations — no self-promotion via state param
  const role: UserRole = 'STUDENT';
  if (state) {
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('ascii'));
      action = decodedState.action || 'login';
    } catch {
      // Ignored: Default to login
    }
  }

  const callbackUrl = new URL('/api/auth/google/callback', req.url).toString();

  try {
    // 1. Exchange Code for Access Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('[GOOGLE_OAUTH_ERROR]', tokenData);
      loginUrl.searchParams.set('error', 'Failed to exchange Google token.');
      return NextResponse.redirect(loginUrl);
    }

    // 2. Fetch User Profile from Google
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    const profileData = await profileResponse.json();
    if (!profileResponse.ok || !profileData.email) {
      console.error('[GOOGLE_PROFILE_ERROR]', profileData);
      loginUrl.searchParams.set('error', 'Failed to read Google profile data.');
      return NextResponse.redirect(loginUrl);
    }

    const { email, name, picture } = profileData;

    // 3. Database Operation
    let user = await prisma.user.findUnique({ where: { email } });

    if (action === 'login') {
      if (!user) {
        // Auto-create account if they try to log in but don't exist
        user = await prisma.user.create({
          data: {
            email,
            name: name || 'User',
            image: picture || null,
            role: role, 
            emailVerified: new Date(),
          },
        });
      } else {
        // Update their picture just in case it changed
        if (picture && user.image !== picture) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { image: picture }
          });
        }
      }
    } else if (action === 'signup') {
      if (user) {
        // Already exists, just log them in instead of throwing error
      } else {
        user = await prisma.user.create({
          data: {
            email,
            name: name || 'User',
            image: picture || null,
            role: role,
            emailVerified: new Date(),
          },
        });
      }
    }

    await awardDailyLoginXp(user!.id);

    // 4. Generate Standard Application Token (async with jose)
    const jwtToken = await signToken({
      userId: user!.id,
      email: user!.email!,
      role: user!.role,
    });

    // 5. Build Redirect response and set cookie
    const targetUrl = user!.role === 'MENTOR' ? '/dashboard/teacher/overview' : '/dashboard';
    const response = NextResponse.redirect(new URL(targetUrl, req.url));

    response.cookies.set(AUTH_COOKIE_NAME, jwtToken, getAuthCookieOptions());

    return response;

  } catch (error) {
    console.error('[GOOGLE_CALLBACK_CATCH]', error);
    loginUrl.searchParams.set('error', 'An internal server error occurred during auth.');
    return NextResponse.redirect(loginUrl);
  }
}
