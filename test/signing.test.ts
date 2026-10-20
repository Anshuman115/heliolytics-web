import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { signRequest, sign, type SignInput } from '../lib/api/signing';

type Vector = {
  id: string;
  kid: string;
  secretHex: string;
  ts: number;
  nonce: string;
  method: string;
  escapedPath: string;
  rawQuery: string;
  contentType: string;
  bodyBase64: string;
  canonicalText: string;
  bodySha256: string;
  signature: string;
  authHeader: string;
};

// Committed fixture bytes copied from the Go implementation.
const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/signing.json', import.meta.url), 'utf8'),
) as { vectors: Vector[] };

function inputFor(vector: Vector, overrides: Partial<SignInput> = {}): SignInput {
  return {
    kid: vector.kid,
    secretHex: vector.secretHex,
    ts: vector.ts,
    nonce: vector.nonce,
    method: vector.method,
    escapedPath: vector.escapedPath,
    rawQuery: vector.rawQuery,
    contentType: vector.contentType,
    body: Buffer.from(vector.bodyBase64, 'base64'),
    ...overrides,
  };
}

function nonceOf(authHeader: string): string {
  return authHeader.split('.')[2];
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('signing vectors', () => {
  it('vendors the five published vectors', () => {
    expect(fixture.vectors.map((vector) => vector.id)).toEqual([
      'phone-get-daily',
      'web-put-profile',
      'phone-post-multipart',
      'phone-post-binary',
      'web-get-repeated-query',
    ]);
  });

  for (const vector of fixture.vectors) {
    it(`reproduces ${vector.id} exactly`, () => {
      const signed = sign(inputFor(vector));
      expect(signed.canonicalText).toBe(vector.canonicalText);
      expect(signed.bodySha256).toBe(vector.bodySha256);
      expect(signed.signature).toBe(vector.signature);
      expect(signed.authHeader).toBe(vector.authHeader);
    });
  }

  it('signs a GET with an empty Content-Type field last', () => {
    const signed = sign(inputFor(fixture.vectors[0]));
    expect(signed.canonicalText.split('\n')).toHaveLength(8);
    expect(signed.canonicalText.endsWith('\n')).toBe(true);
  });

  it('keeps the raw query verbatim, including order and duplicate parameters', () => {
    const vector = fixture.vectors[4];
    expect(vector.id).toBe('web-get-repeated-query');
    const signed = sign(inputFor(vector));
    expect(signed.canonicalText.split('\n')[5]).toBe('to=2026-10-19&from=2026-10-01&from=2026-10-01');
    expect(signed.signature).toBe(vector.signature);
  });

  const baseline = sign(inputFor(fixture.vectors[0]));
  const mutations: Array<[string, Partial<SignInput>]> = [
    ['method', { method: 'POST' }],
    ['escaped path', { escapedPath: '/api/sleep' }],
    ['query order', { rawQuery: 'to=2026-10-19&from=2026-10-01' }],
    ['query encoding', { rawQuery: 'from=2026-10-01&to=2026-10-19%20' }],
    ['body bytes', { body: new Uint8Array([0]) }],
    ['content type', { contentType: 'application/json' }],
  ];

  for (const [label, patch] of mutations) {
    it(`changes the signature for a different ${label}`, () => {
      expect(sign(inputFor(fixture.vectors[0], patch)).signature).not.toBe(baseline.signature);
    });
  }
});

describe('production request signing', () => {
  it('uses a fresh 16 byte nonce for every request', () => {
    vi.stubEnv('HELIOLYTICS_WEB_API_KEY', `web.${'ab'.repeat(32)}`);
    const first = signRequest({
      method: 'GET',
      escapedPath: '/api/daily-metrics',
      rawQuery: 'from=2026-09-20&to=2026-10-19',
      contentType: '',
      body: new Uint8Array(0),
    });
    const second = signRequest({
      method: 'GET',
      escapedPath: '/api/daily-metrics',
      rawQuery: 'from=2026-09-20&to=2026-10-19',
      contentType: '',
      body: new Uint8Array(0),
    });

    expect(first.auth).toMatch(/^web\.\d+\.[0-9a-f]{32}\.[0-9a-f]{64}$/);
    expect(nonceOf(first.auth)).toMatch(/^[0-9a-f]{32}$/);
    expect(nonceOf(first.auth)).not.toBe(nonceOf(second.auth));
    expect(first.contentSha256).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('refuses to sign when only the retired name is set', () => {
    vi.stubEnv('HELIOLYTICS_WEB_API_KEY', '');
    vi.stubEnv('HELIOLYTICS_API_KEY', `web.${'ab'.repeat(32)}`);
    expect(() => signRequest({
      method: 'GET',
      escapedPath: '/health',
      rawQuery: '',
      contentType: '',
      body: new Uint8Array(0),
    })).toThrow(/Invalid HELIOLYTICS_WEB_API_KEY: missing/);
  });

  it('refuses a key that is not a web key', () => {
    vi.stubEnv('HELIOLYTICS_WEB_API_KEY', `phone.${'ab'.repeat(32)}`);
    expect(() => signRequest({
      method: 'GET',
      escapedPath: '/health',
      rawQuery: '',
      contentType: '',
      body: new Uint8Array(0),
    })).toThrow(/kid must be web/);
  });
});
