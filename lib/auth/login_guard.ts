import 'server-only';
import { isIP } from 'node:net';
import { setInterval } from 'node:timers';

export const LOGIN_MAX_ATTEMPTS = 10;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_ENTRIES = 10_000;

export type LoginDecision =
  | { status: 'allowed' }
  | { status: 'limited'; retryAfterSec: number }
  | { status: 'invalid-client' };

export type LoginGuard = {
  check(request: Request): LoginDecision;
  size(): number;
};

type Bucket = { count: number; resetAt: number };

const CLEANUP_INTERVAL_MS = 60_000;
const CLEANUP_BATCH = 256;

// Next reloads modules in development; keep exactly one cleanup timer per process.
const timerRegistry = globalThis as typeof globalThis & {
  heliolyticsLoginCleanup?: NodeJS.Timeout;
};

/**
 * Bounded, expiring login limiter. Production trusts one syntactically valid
 * CF-Connecting-IP because Next exposes no socket peer; local development uses
 * one shared bucket and ignores every forwarded header.
 */
export function createLoginGuard(options: {
  trustedProxy: boolean;
  now?: () => number;
}): LoginGuard {
  const buckets = new Map<string, Bucket>();
  const clock = options.now ?? Date.now;

  function sweep(): void {
    const at = clock();
    let examined = 0;
    buckets.forEach((bucket, key) => {
      if (examined >= CLEANUP_BATCH) return;
      examined += 1;
      if (at >= bucket.resetAt) buckets.delete(key);
    });
  }

  if (timerRegistry.heliolyticsLoginCleanup === undefined) {
    const timer = setInterval(sweep, CLEANUP_INTERVAL_MS);
    timer.unref();
    timerRegistry.heliolyticsLoginCleanup = timer;
  }

  function clientKey(request: Request): string | null {
    if (!options.trustedProxy) return 'local';
    const header = request.headers.get('cf-connecting-ip');
    if (header === null) return null;
    const value = header.trim();
    if (value.length === 0 || value.includes(',')) return null;
    return isIP(value) === 0 ? null : value;
  }

  return {
    check(request) {
      const key = clientKey(request);
      if (key === null) return { status: 'invalid-client' };

      const at = clock();
      const existing = buckets.get(key);
      const bucket: Bucket =
        existing === undefined || at >= existing.resetAt
          ? { count: 0, resetAt: at + LOGIN_WINDOW_MS }
          : existing;
      // Re-insert on every attempt so the oldest key is the least recently used.
      buckets.delete(key);
      buckets.set(key, bucket);
      bucket.count += 1;
      while (buckets.size > LOGIN_MAX_ENTRIES) {
        const oldest = buckets.keys().next();
        if (oldest.done === true) break;
        buckets.delete(oldest.value);
      }

      if (bucket.count <= LOGIN_MAX_ATTEMPTS) return { status: 'allowed' };
      return {
        status: 'limited',
        retryAfterSec: Math.min(
          Math.ceil(LOGIN_WINDOW_MS / 1000),
          Math.max(1, Math.ceil((bucket.resetAt - at) / 1000)),
        ),
      };
    },
    size() {
      return buckets.size;
    },
  };
}
