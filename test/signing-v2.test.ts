import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { signRequestV2, signV2, type SignV2Input } from '../lib/api/signing';

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
  readFileSync(new URL('./fixtures/signing-v2.json', import.meta.url), 'utf8'),
) as { vectors: Vector[] };

function inputFor(vector: Vector, overrides: Partial<SignV2Input> = {}): SignV2Input {
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
  return authHeader.split('.')[3];
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('signing v2 vectors', () => {
  it('vendors the five published vectors', () => {
    expect(fixture.vectors.map((vector) => vector.id)).toEqual(['V1', 'V2', 'V3', 'V4', 'V5']);
  });

  for (const vector of fixture.vectors) {
    it(`reproduces ${vector.id} exactly`, () => {
      const signed = signV2(inputFor(vector));
      expect(signed.canonicalText).toBe(vector.canonicalText);
      expect(signed.bodySha256).toBe(vector.bodySha256);
      expect(signed.signature).toBe(vector.signature);
      expect(signed.authHeader).toBe(vector.authHeader);
    });
  }

  it('signs a GET with an empty Content-Type field last', () => {
    const signed = signV2(inputFor(fixture.vectors[0]));
    expect(signed.canonicalText.split('\n')).toHaveLength(9);
    expect(signed.canonicalText.endsWith('\n')).toBe(true);
  });

  it('keeps the raw query verbatim, including order and duplicate parameters', () => {
    const vector = fixture.vectors[4];
    expect(vector.id).toBe('V5');
    const signed = signV2(inputFor(vector));
    expect(signed.canonicalText.split('\n')[6]).toBe('to=2026-10-19&from=2026-10-01&from=2026-10-01');
    expect(signed.signature).toBe('1975f544c36b4e424fbaa4127c99b26c015b184dfb87e78d01ba89449a2ee571');
  });

  const baseline = signV2(inputFor(fixture.vectors[0]));
  const mutations: Array<[string, Partial<SignV2Input>]> = [
    ['method', { method: 'POST' }],
    ['escaped path', { escapedPath: '/api/v1/sleep' }],
    ['query order', { rawQuery: 'to=2026-10-19&from=2026-10-01' }],
    ['query encoding', { rawQuery: 'from=2026-10-01&to=2026-10-19%20' }],
    ['body bytes', { body: new Uint8Array([0]) }],
    ['content type', { contentType: 'application/json' }],
  ];

  for (const [label, patch] of mutations) {
    it(`changes the signature for a different ${label}`, () => {
      expect(signV2(inputFor(fixture.vectors[0], patch)).signature).not.toBe(baseline.signature);
    });
  }
});

describe('production request signing', () => {
  it('uses a fresh 16 byte nonce for every request', () => {
    vi.stubEnv('HELIOLYTICS_API_KEY', `web.${'ab'.repeat(32)}`);
    const first = signRequestV2({
      method: 'GET',
      escapedPath: '/api/v1/daily-metrics',
      rawQuery: 'from=2026-09-20&to=2026-10-19',
      contentType: '',
      body: new Uint8Array(0),
    });
    const second = signRequestV2({
      method: 'GET',
      escapedPath: '/api/v1/daily-metrics',
      rawQuery: 'from=2026-09-20&to=2026-10-19',
      contentType: '',
      body: new Uint8Array(0),
    });

    expect(first.auth).toMatch(/^v2\.web\.\d+\.[0-9a-f]{32}\.[0-9a-f]{64}$/);
    expect(nonceOf(first.auth)).toMatch(/^[0-9a-f]{32}$/);
    expect(nonceOf(first.auth)).not.toBe(nonceOf(second.auth));
    expect(first.contentSha256).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('refuses a key that is not a web key', () => {
    vi.stubEnv('HELIOLYTICS_API_KEY', `phone.${'ab'.repeat(32)}`);
    expect(() => signRequestV2({
      method: 'GET',
      escapedPath: '/health',
      rawQuery: '',
      contentType: '',
      body: new Uint8Array(0),
    })).toThrow(/kid must be web/);
  });
});
