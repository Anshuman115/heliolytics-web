import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { sessionCookieOptions } from '@/lib/auth/cookie_options';

export async function POST() {
  cookies().set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return Response.json({ ok: true });
}
