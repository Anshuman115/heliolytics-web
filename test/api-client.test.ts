import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../lib/api/client';

describe('apiGet', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('aborts a stalled backend request', async () => {
    vi.stubEnv('HELIOLYTICS_SIGNING_SECRET', 'test-signing-secret');
    const fetcher = vi.fn<typeof fetch>((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));

    await expect(apiGet('/health', { fetcher, timeoutMs: 5 })).rejects.toThrow(
      'API request timed out',
    );
  });
});
