import { cookies } from 'next/headers';
import {
  createSessionValue,
  SESSION_COOKIE,
  SESSION_IDLE_SEC,
} from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { sessionCookieOptions } from '@/lib/auth/cookie_options';
import { createLoginGuard } from '@/lib/auth/login_guard';

// Trusted-edge mode is validated at startup, so reading it once here is safe.
const loginGuard = createLoginGuard({ trustedProxy: process.env.TRUST_PROXY === 'true' });

export async function POST(request: Request) {
  const decision = loginGuard.check(request);
  if (decision.status === 'invalid-client') {
    return Response.json({ error: 'Invalid client address' }, { status: 400 });
  }
  if (decision.status === 'limited') {
    return Response.json(
      { error: 'Too many attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(decision.retryAfterSec) } },
    );
  }

  const passwordHash = process.env.HELIOLYTICS_WEB_PASSWORD_HASH;
  const sessionSecret = process.env.HELIOLYTICS_SESSION_SECRET;
  if (!passwordHash || !sessionSecret) {
    return Response.json({ error: 'Web login is not configured on the server' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    !('password' in body) ||
    typeof body.password !== 'string'
  ) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!(await verifyPassword(body.password, passwordHash))) {
    return Response.json({ error: 'Wrong password' }, { status: 401 });
  }

  const sessionValue = await createSessionValue(sessionSecret);
  if (!sessionValue) {
    return Response.json({ error: 'Web login is not configured on the server' }, { status: 503 });
  }

  cookies().set(SESSION_COOKIE, sessionValue, sessionCookieOptions(SESSION_IDLE_SEC));
  return Response.json({ ok: true });
}
