import 'server-only';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { parseApiKey } from '../auth/runtime_config.mjs';

export const AUTH_HEADER = 'X-Heliolytics-Auth';
export const CONTENT_SHA256_HEADER = 'X-Heliolytics-Content-SHA256';
export const WEB_KEY_KID = 'web';

export type ApiKey = { kid: string; secretHex: string };

export type CanonicalFields = {
  kid: string;
  ts: number;
  nonce: string;
  method: string;
  escapedPath: string;
  rawQuery: string;
  bodySha256: string;
  contentType: string;
};

export type SignInput = Omit<CanonicalFields, 'bodySha256'> & {
  secretHex: string;
  body: Uint8Array;
};

export type SignResult = {
  canonicalText: string;
  bodySha256: string;
  signature: string;
  authHeader: string;
};

export type SignedHeaders = {
  auth: string;
  contentSha256: string;
};

export type SignRequestInput = {
  method: string;
  escapedPath: string;
  rawQuery: string;
  contentType: string;
  body: Uint8Array;
  key?: ApiKey;
  ts?: number;
  nonce?: string;
};

/**
 * Eight canonical lines joined with newlines, Content-Type last. An empty
 * Content-Type therefore leaves the final empty field after the last separator.
 */
export function canonicalText(fields: CanonicalFields): string {
  return [
    fields.kid,
    String(fields.ts),
    fields.nonce,
    fields.method.toUpperCase(),
    fields.escapedPath,
    fields.rawQuery,
    fields.bodySha256,
    fields.contentType,
  ].join('\n');
}

/** Pure signer shared by the published vectors and by production requests. */
export function sign(input: SignInput): SignResult {
  const bodySha256 = createHash('sha256').update(input.body).digest('hex');
  const text = canonicalText({
    kid: input.kid,
    ts: input.ts,
    nonce: input.nonce,
    method: input.method,
    escapedPath: input.escapedPath,
    rawQuery: input.rawQuery,
    bodySha256,
    contentType: input.contentType,
  });
  const signature = createHmac('sha256', Buffer.from(input.secretHex, 'hex'))
    .update(text)
    .digest('hex');
  return {
    canonicalText: text,
    bodySha256,
    signature,
    authHeader: `${input.kid}.${input.ts}.${input.nonce}.${signature}`,
  };
}

function readWebKey(): ApiKey {
  const raw = process.env.HELIOLYTICS_API_KEY;
  if (!raw) throw new Error('Invalid HELIOLYTICS_API_KEY: missing');
  const parsed = parseApiKey(raw);
  if (!parsed) throw new Error('Invalid HELIOLYTICS_API_KEY: expected web.<64 lowercase hex>');
  if (parsed.kid !== WEB_KEY_KID) {
    throw new Error('Invalid HELIOLYTICS_API_KEY: kid must be web');
  }
  return { kid: parsed.kid, secretHex: parsed.secretHex };
}

export function signRequest(input: SignRequestInput): SignedHeaders {
  const key = input.key ?? readWebKey();
  const result = sign({
    kid: key.kid,
    secretHex: key.secretHex,
    ts: input.ts ?? Math.floor(Date.now() / 1000),
    nonce: input.nonce ?? randomBytes(16).toString('hex'),
    method: input.method,
    escapedPath: input.escapedPath,
    rawQuery: input.rawQuery,
    contentType: input.contentType,
    body: input.body,
  });
  return { auth: result.authHeader, contentSha256: result.bodySha256 };
}
