import { describe, expect, it } from 'vitest';
import {
  createLoginGuard,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_MAX_ENTRIES,
  LOGIN_WINDOW_MS,
} from '../lib/auth/login_guard';

function requestFrom(ip: string | null, forwarded: Record<string, string> = {}): Request {
  const headers = new Headers(forwarded);
  if (ip !== null) headers.set('cf-connecting-ip', ip);
  return new Request('https://console.example.test/api/auth/login', { method: 'POST', headers });
}

describe('login guard in trusted edge mode', () => {
  it('allows ten attempts per client and limits the eleventh', () => {
    let now = 1_700_000_000_000;
    const guard = createLoginGuard({ trustedProxy: true, now: () => now });

    for (let attempt = 1; attempt <= LOGIN_MAX_ATTEMPTS; attempt += 1) {
      expect(
        guard.check(requestFrom('203.0.113.7', { 'x-forwarded-for': `198.51.100.${attempt}` })),
      ).toEqual({ status: 'allowed' });
    }

    const limited = guard.check(requestFrom('203.0.113.7', { 'x-forwarded-for': '198.51.100.99' }));
    expect(limited.status).toBe('limited');
    if (limited.status === 'limited') {
      expect(limited.retryAfterSec).toBeGreaterThan(0);
      expect(limited.retryAfterSec).toBeLessThanOrEqual(LOGIN_WINDOW_MS / 1000);
    }

    expect(guard.check(requestFrom('203.0.113.8'))).toEqual({ status: 'allowed' });

    now += LOGIN_WINDOW_MS;
    expect(guard.check(requestFrom('203.0.113.7'))).toEqual({ status: 'allowed' });
  });

  it('rejects a missing, combined or unparseable client address before verification', () => {
    const guard = createLoginGuard({ trustedProxy: true, now: () => 1_700_000_000_000 });

    expect(guard.check(requestFrom(null))).toEqual({ status: 'invalid-client' });
    expect(guard.check(requestFrom(''))).toEqual({ status: 'invalid-client' });
    expect(guard.check(requestFrom('203.0.113.7, 198.51.100.4'))).toEqual({ status: 'invalid-client' });
    expect(guard.check(requestFrom('not-an-ip'))).toEqual({ status: 'invalid-client' });
    expect(guard.size()).toBe(0);
  });
});

describe('login guard in local mode', () => {
  it('ignores every forwarded header and shares one bucket', () => {
    const guard = createLoginGuard({ trustedProxy: false, now: () => 1_700_000_000_000 });

    for (let attempt = 1; attempt <= LOGIN_MAX_ATTEMPTS; attempt += 1) {
      expect(
        guard.check(requestFrom('203.0.113.7', { 'x-forwarded-for': `198.51.100.${attempt}` })),
      ).toEqual({ status: 'allowed' });
    }

    expect(guard.check(requestFrom('198.51.100.200')).status).toBe('limited');
    expect(guard.size()).toBe(1);
  });
});

describe('login guard memory bounds', () => {
  it('never keeps more than the entry cap and prunes expired buckets', () => {
    let now = 1_700_000_000_000;
    const guard = createLoginGuard({ trustedProxy: true, now: () => now });

    for (let index = 0; index < LOGIN_MAX_ENTRIES + 500; index += 1) {
      const ip = `10.${(index >> 16) & 255}.${(index >> 8) & 255}.${index & 255}`;
      guard.check(requestFrom(ip));
    }
    expect(guard.size()).toBeLessThanOrEqual(LOGIN_MAX_ENTRIES);

    now += LOGIN_WINDOW_MS + 1;
    for (let index = 0; index < 50; index += 1) {
      guard.check(requestFrom(`192.0.2.${index}`));
    }
    expect(guard.size()).toBeLessThanOrEqual(LOGIN_MAX_ENTRIES);
  });
});
