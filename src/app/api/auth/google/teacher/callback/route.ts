import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function exchangeCodeForTokens(code: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${APP_URL}/api/auth/google/teacher/callback`,
      grant_type: "authorization_code",
    }),
  });
  return res.json();
}

async function getGoogleProfile(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json() as Promise<{
    id: string;
    email: string;
    name: string;
    picture?: string;
    verified_email: boolean;
  }>;
}

/**
 * GET /api/auth/google/teacher/callback
 * Handles Google OAuth callback for teacher accounts.
 * 
 * Scenarios:
 * 1. New Google user → create PENDING MENTOR account → redirect to /teacher-register?status=pending
 * 2. Existing ACTIVE teacher via Google → redirect to /teacher-login?status=google_linked
 * 3. Existing PENDING teacher → redirect to /teacher-register?status=pending
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  if (error || !code || state !== "teacher_registration") {
    return NextResponse.redirect(`${APP_URL}/teacher-register?error=oauth_cancelled`);
  }

  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(`${APP_URL}/teacher-register?error=oauth_not_configured`);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token) {
      return NextResponse.redirect(`${APP_URL}/teacher-register?error=token_exchange_failed`);
    }

    // Fetch Google profile
    const profile = await getGoogleProfile(tokens.access_token);
    if (!profile.email || !profile.verified_email) {
      return NextResponse.redirect(`${APP_URL}/teacher-register?error=email_not_verified`);
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: profile.email.toLowerCase() },
      select: { id: true, role: true, mentorStatus: true, image: true },
    });

    if (existing) {
      if (existing.role !== "MENTOR") {
        // Student/Admin tried to use teacher Google OAuth
        return NextResponse.redirect(`${APP_URL}/teacher-register?error=not_a_teacher_account`);
      }

      // Update Google profile picture if not set
      if (!existing.image && profile.picture) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { image: profile.picture },
        });
      }

      if (existing.mentorStatus === "PENDING") {
        return NextResponse.redirect(`${APP_URL}/teacher-register?status=pending&email=${encodeURIComponent(profile.email)}`);
      }

      // ACTIVE or null (existing legacy mentor) → go to OTP login page
      return NextResponse.redirect(`${APP_URL}/teacher-login?status=google_linked&email=${encodeURIComponent(profile.email)}`);
    }

    // New user — create PENDING teacher account (no password since they used Google)
    await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email.toLowerCase(),
        image: profile.picture ?? null,
        role: "MENTOR",
        mentorStatus: "PENDING",
        // No passwordHash — Google-only account until admin sets a password
      },
    });

    return NextResponse.redirect(
      `${APP_URL}/teacher-register?status=pending&email=${encodeURIComponent(profile.email)}&name=${encodeURIComponent(profile.name)}`
    );
  } catch (err) {
    console.error("[GOOGLE_TEACHER_CALLBACK_ERROR]", err);
    return NextResponse.redirect(`${APP_URL}/teacher-register?error=server_error`);
  }
}
