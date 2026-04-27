import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { JWTPayload } from 'jose';
import { jwtVerify } from 'jose';

// AUTH_COOKIE_NAME is hardcoded to avoid importing lib/auth which relies on node jsonwebtoken

const STUDENT_DASHBOARD_PREFIX = '/dashboard';
const TEACHER_DASHBOARD_PREFIX = '/dashboard/teacher';
const ADMIN_PREFIX = '/admin';
const SUPER_ADMIN_PREFIX = '/admin/super';

type AuthPayload = JWTPayload & {
  role?: 'STUDENT' | 'MENTOR' | 'ADMIN' | 'SUPER_ADMIN';
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. Get token
  const token = request.cookies.get('divergent_auth_token')?.value || request.cookies.get('token')?.value;
  let user: AuthPayload | null = null;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || '');
      const { payload } = await jwtVerify(token, secret);
      user = payload as AuthPayload;
    } catch {
      user = null;
    }
  }

  // 2. Handle paths for logged-in users attempting to access auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    let dashboardUrl = '/dashboard';
    if (user.role === 'SUPER_ADMIN') dashboardUrl = '/admin/super/overview';
    else if (user.role === 'ADMIN') dashboardUrl = '/admin/overview';
    else if (user.role === 'MENTOR') dashboardUrl = '/dashboard/teacher/overview';
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // 3. Protect /admin/* routes
  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // /admin/super/* — SUPER_ADMIN only
    if (pathname.startsWith(SUPER_ADMIN_PREFIX)) {
      if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/admin/overview', request.url));
      }
    } else {
      // /admin/* — ADMIN or SUPER_ADMIN
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // 4. Handle protected dashboard routes
  if (pathname.startsWith(STUDENT_DASHBOARD_PREFIX)) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based protection for teacher routes
    if (pathname.startsWith(TEACHER_DASHBOARD_PREFIX)) {
      if (user.role !== 'MENTOR' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } else {
      if (pathname === '/dashboard' && (user.role === 'MENTOR' || user.role === 'ADMIN')) {
         return NextResponse.redirect(new URL('/dashboard/teacher/overview', request.url));
      }
      if (pathname === '/dashboard' && user.role === 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/admin/super/overview', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login', '/signup'],
};
