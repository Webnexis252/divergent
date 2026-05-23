import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { UserRole } from '@prisma/client';

const JWT_SECRET_VALUE = process.env.JWT_SECRET!;
export const AUTH_COOKIE_NAME = 'divergent_auth_token';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export type JwtPayload = {
  userId: string;
  email: string;
  role: UserRole;
};

export type MagicLinkPayload = {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
};

/**
 * Returns the JWT secret as a Uint8Array, required by the `jose` library.
 */
function getSecretKey(): Uint8Array {
  if (!JWT_SECRET_VALUE) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return new TextEncoder().encode(JWT_SECRET_VALUE);
}

/**
 * Signs a JWT for an authenticated user. Uses `jose` for Edge Runtime compatibility.
 */
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

/**
 * Verifies a raw JWT string and returns the decoded payload or null if invalid.
 * Edge Runtime compatible.
 */
export async function verifyTokenValue(
  token?: string | null,
): Promise<JwtPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    // Validate the shape of the payload
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

/**
 * Signs a JWT for a magic link registration.
 */
export async function signMagicLinkToken(payload: MagicLinkPayload): Promise<string> {
  return new SignJWT({ ...payload, isMagicLink: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // Magic links expire in 1 hour
    .sign(getSecretKey());
}

/**
 * Verifies a magic link JWT string and returns the decoded payload or null if invalid.
 */
export async function verifyMagicLinkTokenValue(
  token?: string | null,
): Promise<MagicLinkPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      !payload.isMagicLink ||
      typeof payload.name !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.passwordHash !== 'string'
    ) {
      return null;
    }
    return {
      name: payload.name,
      email: payload.email,
      phone: typeof payload.phone === 'string' ? payload.phone : undefined,
      passwordHash: payload.passwordHash,
    };
  } catch {
    return null;
  }
}

/**
 * Common cookie options used when persisting the auth token.
 */
export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

/**
 * Reads the JWT from the Authorization header first, then the auth cookie.
 */
export function getRequestToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return req.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;
}

/**
 * Verifies the JWT from the Authorization header or auth cookie.
 * Returns the decoded payload or null if invalid.
 * NOTE: This is an async function — await it in API routes.
 */
export async function verifyToken(
  req: NextRequest,
): Promise<JwtPayload | null> {
  return verifyTokenValue(getRequestToken(req));
}

/**
 * Extracts the user from the request and checks if they have an allowed role.
 * Use this inside API routes for role-based access control (RBAC).
 *
 * @example
 * const user = await requireAuth(req, ['ADMIN', 'MENTOR']);
 * if (!user) return apiUnauthorized();
 */
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: UserRole[],
): Promise<JwtPayload | null> {
  const user = await verifyToken(req);
  if (!user) return null;

  if (allowedRoles && allowedRoles.length > 0) {
    // SUPER_ADMIN implicitly has all permissions
    if (user.role === 'SUPER_ADMIN') {
      return user;
    }

    if (!allowedRoles.includes(user.role)) {
      return null;
    }
  }
  return user;
}

/**
 * Signs a short-lived JWT that proves a phone number was successfully OTP-verified.
 * Used during signup: the form stores this token and passes it to /api/auth/register.
 */
export async function signPhoneVerifiedToken(phone: string): Promise<string> {
  return new SignJWT({ phone, isPhoneVerified: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getSecretKey());
}

/**
 * Verifies a phone-verified JWT and returns the phone number, or null if invalid/expired.
 */
export async function verifyPhoneVerifiedToken(
  token?: string | null,
): Promise<{ phone: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.isPhoneVerified !== true || typeof payload.phone !== 'string') {
      return null;
    }
    return { phone: payload.phone };
  } catch {
    return null;
  }
}

