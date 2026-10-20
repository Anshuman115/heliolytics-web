import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiGet, type ApiFetcher, type ApiFetcherInput } from '../lib/api/client';

const API_KEY = `web.${'cd'.repeat(32)}`;
const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('signed transport', () => {
  it('signs exactly the URL it fetches, with no bearer token', async () => {
    vi.stubEnv('HELIOLYTICS_API_KEY', API_KEY);
    vi.stubEnv('API_INTERNAL_URL', 'http://127.0.0.1:8080');

    let seenUrl = '';
    let seenInit: ApiFetcherInput | undefined;
    const fetcher: ApiFetcher = async (url, init) => {
      seenUrl = url;
      seenInit = init;
      return jsonResponse(200, { days: [] });
    };

    const body = await apiGet('/api/v1/daily-metrics?from=2026-09-20&to=2026-10-19', { fetcher });

    expect(body).toEqual({ days: [] });
    expect(seenUrl).toBe('http://127.0.0.1:8080/api/v1/daily-metrics?from=2026-09-20&to=2026-10-19');
    const headers = new Headers(seenInit?.headers);
    expect(headers.get('X-Heliolytics-Auth')).toMatch(/^v2\.web\.\d+\.[0-9a-f]{32}\.[0-9a-f]{64}$/);
    expect(headers.get('X-Heliolytics-Content-SHA256')).toBe(EMPTY_SHA256);
    expect(headers.get('X-Heliolytics-Token')).toBeNull();
    expect(headers.get('Content-Type')).toBeNull();
    expect(seenInit?.body).toBeUndefined();
    expect(seenInit?.cache).toBe('no-store');
    expect(seenInit?.method).toBe('GET');
  });

  it('keeps 429 metadata without retrying', async () => {
    vi.stubEnv('HELIOLYTICS_API_KEY', API_KEY);
    let calls = 0;
    const fetcher: ApiFetcher = async () => {
      calls += 1;
      return jsonResponse(
        429,
        { error: { code: 'rate_limited', message: 'Too many requests' } },
        { 'retry-after': '7' },
      );
    };

    const error = await apiGet('/api/v1/sleep', { fetcher }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    if (error instanceof ApiError) {
      expect(error.status).toBe(429);
      expect(error.code).toBe('rate_limited');
      expect(error.message).toBe('Too many requests');
      expect(error.retryAfterSec).toBe(7);
    }
    expect(calls).toBe(1);
  });

  it('reports a 401 without retrying or leaking the response body', async () => {
    vi.stubEnv('HELIOLYTICS_API_KEY', API_KEY);
    let calls = 0;
    const fetcher: ApiFetcher = async () => {
      calls += 1;
      return jsonResponse(401, { error: { code: 'unauthorized', message: 'Bad signature' } });
    };

    const error = await apiGet('/api/v1/sleep', { fetcher }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    if (error instanceof ApiError) {
      expect(error.status).toBe(401);
      expect(error.code).toBe('unauthorized');
      expect(error.message).toBe('Bad signature');
      expect(error.message).not.toContain(API_KEY);
    }
    expect(calls).toBe(1);
  });

  it('replaces an unparseable body with a bounded message', async () => {
    vi.stubEnv('HELIOLYTICS_API_KEY', API_KEY);
    const raw = '<html><body>stack trace and secret material</body></html>';
    const fetcher: ApiFetcher = async () => new Response(raw, { status: 500 });

    const error = await apiGet('/api/v1/sleep', { fetcher }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    if (error instanceof ApiError) {
      expect(error.status).toBe(500);
      expect(error.code).toBe('http_500');
      expect(error.message).toBe('The API failed');
      expect(error.message).not.toContain('stack trace');
    }
  });

  it('aborts a stalled request and clears the timer', async () => {
    vi.stubEnv('HELIOLYTICS_API_KEY', API_KEY);
    let aborted = false;
    const fetcher: ApiFetcher = (_url, init) => {
      const { promise, reject } = Promise.withResolvers<Response>();
      init.signal.addEventListener('abort', () => {
        aborted = true;
        reject(new Error('aborted'));
      });
      return promise;
    };

    await expect(apiGet('/health', { fetcher, timeoutMs: 5 })).rejects.toThrow(
      'API request timed out',
    );
    expect(aborted).toBe(true);
  });
});
