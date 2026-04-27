import { apiError, apiServerError } from "@/lib/api-response";

/**
 * GET /api/auth/google/teacher
 * Initiates Google OAuth for teacher registration/login.
 * Redirects user to Google's consent screen.
 * 
 * Env vars required:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   NEXT_PUBLIC_APP_URL
 */
export async function GET() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return apiError("Google OAuth is not configured", 503);
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/teacher/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "select_account",
      state: "teacher_registration", // passed through to callback for verification
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return Response.redirect(googleAuthUrl);
  } catch (err) {
    console.error("[GOOGLE_TEACHER_INIT_ERROR]", err);
    return apiServerError();
  }
}
