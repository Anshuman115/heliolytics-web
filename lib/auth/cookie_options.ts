/**
 * Cookie security is a configuration decision, never a request header claim.
 * Production is always Secure regardless of a forwarded proto value, so a
 * forged `x-forwarded-proto: http` cannot weaken the issued cookie.
 */
export function sessionCookieSecure(request?: Request): boolean {
  void request;
  if (process.env.NODE_ENV === 'production') return true;
  return process.env.COOKIE_SECURE === 'true';
}

/** One cookie attribute set shared by issue, renewal and deletion. */
export function sessionCookieOptions(maxAge: number): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax';
  path: '/';
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}
