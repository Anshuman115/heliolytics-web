export const SESSION_COOKIE = 'heliolytics_session';
export const SESSION_IDLE_SEC = 7 * 24 * 60 * 60;
export const SESSION_ABSOLUTE_SEC = 30 * 24 * 60 * 60;
export const SESSION_RENEW_BELOW_SEC = 3 * 24 * 60 * 60;

export type SessionVerification = {
  valid: boolean;
  issuedAt?: number;
  expiresAt?: number;
};

export type SessionRenewal = {
  value: string;
  maxAge: number;
};

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function sessionSecretBytes(secret: string | undefined): Uint8Array | null {
  if (!secret || !/^[0-9a-fA-F]{64}$/.test(secret)) return null;
  return hexToBytes(secret.toLowerCase());
}

async function signSession(
  issuedAt: number,
  expiresAt: number,
  secret: string,
): Promise<string | null> {
  const secretBytes = sessionSecretBytes(secret);
  if (!secretBytes) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const payload = `${issuedAt}:${expiresAt}`;
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );
  return bytesToHex(new Uint8Array(signature));
}

async function encodeSession(
  issuedAt: number,
  expiresAt: number,
  secret: string,
): Promise<string | null> {
  const signature = await signSession(issuedAt, expiresAt, secret);
  return signature ? `${issuedAt}.${expiresAt}.${signature}` : null;
}

export async function createSessionValue(
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<string | null> {
  return encodeSession(now, now + SESSION_IDLE_SEC, secret);
}

export async function verifySessionValue(
  token: string,
  secret: string | undefined,
  now = Math.floor(Date.now() / 1000),
): Promise<SessionVerification> {
  if (!sessionSecretBytes(secret)) return { valid: false };
  const match = /^(\d+)\.(\d+)\.([0-9a-f]{64})$/.exec(token);
  if (!match) return { valid: false };
  const issuedAt = Number(match[1]);
  const expiresAt = Number(match[2]);
  if (
    !Number.isSafeInteger(issuedAt) ||
    !Number.isSafeInteger(expiresAt) ||
    issuedAt > now ||
    expiresAt <= now ||
    expiresAt > issuedAt + SESSION_ABSOLUTE_SEC ||
    now >= issuedAt + SESSION_ABSOLUTE_SEC
  ) {
    return { valid: false };
  }
  const expected = await signSession(issuedAt, expiresAt, secret!);
  const got = hexToBytes(match[3]);
  const want = expected ? hexToBytes(expected) : null;
  if (!got || !want || !timingSafeEqual(got, want)) return { valid: false };
  return { valid: true, issuedAt, expiresAt };
}

export async function renewSessionValue(
  session: SessionVerification,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<SessionRenewal | null> {
  if (!session.valid || session.issuedAt === undefined || session.expiresAt === undefined) {
    return null;
  }
  if (session.expiresAt - now >= SESSION_RENEW_BELOW_SEC) return null;
  const absoluteExpiry = session.issuedAt + SESSION_ABSOLUTE_SEC;
  const expiresAt = Math.min(now + SESSION_IDLE_SEC, absoluteExpiry);
  if (expiresAt <= now) return null;
  const value = await encodeSession(session.issuedAt, expiresAt, secret);
  return value ? { value, maxAge: expiresAt - now } : null;
}
