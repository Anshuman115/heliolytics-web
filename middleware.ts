import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { safeRedirectPath } from '@/lib/auth/redirect';
import { sessionCookieOptions } from '@/lib/auth/cookie_options';
import {
  renewSessionValue,
  SESSION_COOKIE,
  type SessionVerification,
  verifySessionValue,
} from '@/lib/auth/session';

async function readSession(request: NextRequest): Promise<SessionVerification> {
  if (!process.env.HELIOLYTICS_WEB_PASSWORD_HASH) return { valid: false };
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return verifySessionValue(token ?? '', process.env.HELIOLYTICS_SESSION_SECRET);
}

async function applyRenewal(
  response: NextResponse,
  session: SessionVerification,
): Promise<NextResponse> {
  const secret = process.env.HELIOLYTICS_SESSION_SECRET;
  if (!secret) return response;
  const renewal = await renewSessionValue(session, secret);
  if (renewal) {
    response.cookies.set(SESSION_COOKIE, renewal.value, sessionCookieOptions(renewal.maxAge));
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public: auth endpoints, framework assets and the about page.
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/about')
  ) {
    return NextResponse.next();
  }

  const session = await readSession(request);

  if (pathname.startsWith('/login')) {
    if (session.valid) {
      const from = safeRedirectPath(request.nextUrl.searchParams.get('from'));
      return applyRenewal(NextResponse.redirect(new URL(from, request.url)), session);
    }
    return NextResponse.next();
  }

  if (session.valid) {
    return applyRenewal(NextResponse.next(), session);
  }

  const login = new URL('/login', request.url);
  if (pathname !== '/') login.searchParams.set('from', pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
