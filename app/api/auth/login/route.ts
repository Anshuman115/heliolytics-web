import { cookies } from 'next/headers';
import {
  createSessionValue,
  SESSION_COOKIE,
  SESSION_IDLE_SEC,
} from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { sessionCookieSecure } from '@/lib/auth/cookie_options';
import { loginRateLimited } from '@/lib/auth/login_guard';

export async function POST(request: Request) {
  if (loginRateLimited(request)) {
    return Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  const passwordHash = process.env.HELIOLYTICS_WEB_PASSWORD_HASH;
  const sessionSecret = process.env.HELIOLYTICS_SESSION_SECRET;
  if (!passwordHash || !sessionSecret) {
    return Response.json({ error: 'Web login is not configured on the server' }, { status: 503 });
  }

  let password = '';
  try {
    const body = (await request.json()) as { password?: string };
    password = body.password ?? '';
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!(await verifyPassword(password, passwordHash))) {
    return Response.json({ error: 'Wrong password' }, { status: 401 });
  }

  const sessionValue = await createSessionValue(sessionSecret);
  if (!sessionValue) {
    return Response.json({ error: 'Web login is not configured on the server' }, { status: 503 });
  }

  cookies().set(SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    secure: sessionCookieSecure(request),
    sameSite: 'lax',
    maxAge: SESSION_IDLE_SEC,
    path: '/',
  });

  return Response.json({ ok: true });
}
