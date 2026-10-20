/**
 * Shared runtime configuration grammar, with no environment reads or import-time side
 * effects. Password checks, the hash CLI, request signing and startup validation use it.
 */

export const PASSWORD_MAX_BYTES = 256;
export const SCRYPT_N = 32768;
export const SCRYPT_R = 8;
export const SCRYPT_P = 3;
export const SCRYPT_KEY_LENGTH = 32;
export const SCRYPT_MAX_MEMORY = 128 * 1024 * 1024;

export const SESSION_SECRET_PATTERN = /^[0-9a-f]{64}$/;
export const API_KEY_SECRET_PATTERN = /^[0-9a-f]{64}$/;
export const API_KEY_KID_PATTERN = /^[a-z][a-z0-9-]{1,15}$/;

/** The published signing vector secret. Never accepted as runtime config. */
export const EXAMPLE_SECRET_HEX =
  '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';

export const WEB_KEY_KID = 'web';

const PASSWORD_HASH_PATTERN = new RegExp(
  `^scrypt\\$N=${SCRYPT_N}\\$r=${SCRYPT_R}\\$p=${SCRYPT_P}\\$([0-9a-f]{32})\\$([0-9a-f]{64})$`,
);

export class RuntimeConfigError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'RuntimeConfigError';
  }
}

/**
 * @param {string} saltHex
 * @param {string} hashHex
 * @returns {string}
 */
export function encodePasswordHash(saltHex, hashHex) {
  return `scrypt$N=${SCRYPT_N}$r=${SCRYPT_R}$p=${SCRYPT_P}$${saltHex}$${hashHex}`;
}

/**
 * @param {string} encoded
 * @returns {{ saltHex: string, hashHex: string } | null}
 */
export function parsePasswordHash(encoded) {
  const match = PASSWORD_HASH_PATTERN.exec(encoded);
  if (!match) return null;
  return { saltHex: match[1], hashHex: match[2] };
}

/**
 * @param {string} value
 * @returns {{ kid: string, secretHex: string } | null}
 */
export function parseApiKey(value) {
  if (typeof value !== 'string' || value.includes(',')) return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const kid = parts[0];
  const secretHex = parts[1];
  if (!API_KEY_KID_PATTERN.test(kid)) return null;
  if (!API_KEY_SECRET_PATTERN.test(secretHex)) return null;
  return { kid, secretHex };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} field
 * @returns {string}
 */
function readRequired(env, field) {
  const raw = env[field];
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new RuntimeConfigError(`Invalid ${field}: missing`);
  }
  return raw;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} field
 * @returns {boolean | undefined}
 */
function readFlag(env, field) {
  const raw = env[field];
  if (raw === undefined || raw === '') return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new RuntimeConfigError(`Invalid ${field}: expected true or false`);
}

/**
 * Validate the web runtime environment before the server listens. Errors name
 * a field and a rule only; no submitted value is ever included.
 *
 * @param {Record<string, string | undefined>} env
 */
export function validateRuntimeConfig(env) {
  const passwordHash = readRequired(env, 'HELIOLYTICS_WEB_PASSWORD_HASH');
  if (!parsePasswordHash(passwordHash)) {
    throw new RuntimeConfigError(
      `Invalid HELIOLYTICS_WEB_PASSWORD_HASH: expected scrypt with N=${SCRYPT_N} r=${SCRYPT_R} p=${SCRYPT_P}`,
    );
  }

  const sessionSecret = readRequired(env, 'HELIOLYTICS_SESSION_SECRET');
  if (!SESSION_SECRET_PATTERN.test(sessionSecret)) {
    throw new RuntimeConfigError(
      'Invalid HELIOLYTICS_SESSION_SECRET: expected 64 lowercase hex characters',
    );
  }

  const apiKeyRaw = readRequired(env, 'HELIOLYTICS_API_KEY');
  const apiKey = parseApiKey(apiKeyRaw);
  if (!apiKey) {
    throw new RuntimeConfigError(
      'Invalid HELIOLYTICS_API_KEY: expected one web.<64 lowercase hex> key',
    );
  }
  if (apiKey.kid !== WEB_KEY_KID) {
    throw new RuntimeConfigError('Invalid HELIOLYTICS_API_KEY: kid must be web');
  }
  if (apiKey.secretHex === EXAMPLE_SECRET_HEX) {
    throw new RuntimeConfigError('Invalid HELIOLYTICS_API_KEY: published example secret');
  }
  if (apiKey.secretHex === sessionSecret) {
    throw new RuntimeConfigError(
      'Invalid HELIOLYTICS_SESSION_SECRET: must differ from the web API key',
    );
  }

  const apiUrlRaw = readRequired(env, 'API_INTERNAL_URL');
  let apiUrl;
  try {
    apiUrl = new URL(apiUrlRaw);
  } catch {
    throw new RuntimeConfigError('Invalid API_INTERNAL_URL: expected an http or https origin');
  }
  if (apiUrl.protocol !== 'http:' && apiUrl.protocol !== 'https:') {
    throw new RuntimeConfigError('Invalid API_INTERNAL_URL: expected an http or https origin');
  }
  if (apiUrl.username || apiUrl.password) {
    throw new RuntimeConfigError('Invalid API_INTERNAL_URL: must not embed credentials');
  }
  if (apiUrl.search || apiUrl.hash) {
    throw new RuntimeConfigError('Invalid API_INTERNAL_URL: must not include a query or fragment');
  }

  const production = env.NODE_ENV === 'production';
  const trustProxy = readFlag(env, 'TRUST_PROXY') ?? false;
  const cookieSecure = readFlag(env, 'COOKIE_SECURE') ?? false;
  if (production && !trustProxy) {
    throw new RuntimeConfigError('Invalid TRUST_PROXY: must be true in production');
  }
  if (production && !cookieSecure) {
    throw new RuntimeConfigError('Invalid COOKIE_SECURE: must be true in production');
  }

  return {
    passwordHash,
    sessionSecret,
    apiKey,
    apiUrl: apiUrl.href.replace(/\/$/, ''),
    production,
    trustProxy,
    cookieSecure,
  };
}
