import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionCookieOptions, sessionCookieSecure } from '../lib/auth/cookie_options';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('session cookie security', () => {
  it('is always Secure in production, whatever the forwarded proto says', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('COOKIE_SECURE', 'false');

    const plain = new Request('http://internal:3000/login', {
      headers: { 'x-forwarded-proto': 'http' },
    });
    const forged = new Request('http://internal:3000/login', {
      headers: { 'x-forwarded-proto': 'https, http' },
    });

    expect(sessionCookieSecure(plain)).toBe(true);
    expect(sessionCookieSecure(forged)).toBe(true);
    expect(sessionCookieOptions(60)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60,
    });
  });

  it('honors an explicit local opt-out outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('COOKIE_SECURE', 'false');
    expect(sessionCookieSecure()).toBe(false);
    expect(sessionCookieOptions(0).secure).toBe(false);

    vi.stubEnv('COOKIE_SECURE', 'true');
    expect(sessionCookieOptions(0).secure).toBe(true);
  });

  it('issues, renews and clears with one attribute set', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const issued = sessionCookieOptions(7 * 24 * 60 * 60);
    const renewed = sessionCookieOptions(3 * 24 * 60 * 60);
    const cleared = sessionCookieOptions(0);

    expect(issued).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', secure: true });
    expect(renewed).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', secure: true });
    expect(cleared).toEqual({ httpOnly: true, sameSite: 'lax', path: '/', secure: true, maxAge: 0 });
  });
});
