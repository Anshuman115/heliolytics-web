import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { safeRedirectPath } from '@/lib/auth/login_guard';
import { sessionCookieSecure } from '@/lib/auth/cookie_options';
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
  request: NextRequest,
  session: SessionVerification,
): Promise<NextResponse> {
  const secret = process.env.HELIOLYTICS_SESSION_SECRET;
  if (!secret) return response;
  const renewal = await renewSessionValue(session, secret);
  if (renewal) {
    response.cookies.set(SESSION_COOKIE, renewal.value, {
      httpOnly: true,
      secure: sessionCookieSecure(request),
      sameSite: 'lax',
      maxAge: renewal.maxAge,
      path: '/',
    });
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public: auth endpoints, framework assets, the demo, and the about page.
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/about')
  ) {
    return NextResponse.next();
  }

  const session = await readSession(request);

  if (pathname.startsWith('/login')) {
    if (session.valid) {
      const from = safeRedirectPath(request.nextUrl.searchParams.get('from'));
      return applyRenewal(
        NextResponse.redirect(new URL(from, request.url)),
        request,
        session,
      );
    }
    return NextResponse.next();
  }

  if (session.valid) {
    return applyRenewal(NextResponse.next(), request, session);
  }

  const login = new URL('/login', request.url);
  if (pathname !== '/') login.searchParams.set('from', pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
