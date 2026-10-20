import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_SECRET_HEX,
  encodePasswordHash,
  parseApiKey,
  parsePasswordHash,
  validateRuntimeConfig,
} from '../lib/auth/runtime_config.mjs';

const PASSWORD_HASH = encodePasswordHash('11'.repeat(16), '22'.repeat(32));
const SESSION_SECRET = '3f'.repeat(32);
const WEB_SECRET = '5a'.repeat(32);

const validEnv: Record<string, string | undefined> = {
  NODE_ENV: 'production',
  HELIOLYTICS_WEB_PASSWORD_HASH: PASSWORD_HASH,
  HELIOLYTICS_SESSION_SECRET: SESSION_SECRET,
  HELIOLYTICS_API_KEY: `web.${WEB_SECRET}`,
  API_INTERNAL_URL: 'http://127.0.0.1:8080',
  TRUST_PROXY: 'true',
  COOKIE_SECURE: 'true',
};

function failure(env: Record<string, string | undefined>): string {
  try {
    validateRuntimeConfig(env);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('validateRuntimeConfig accepted an invalid environment');
}

describe('runtime configuration', () => {
  it('imports without any environment and accepts a complete production set', () => {
    const config = validateRuntimeConfig(validEnv);
    expect(config.production).toBe(true);
    expect(config.trustProxy).toBe(true);
    expect(config.cookieSecure).toBe(true);
    expect(config.apiUrl).toBe('http://127.0.0.1:8080');
    expect(config.apiKey).toEqual({ kid: 'web', secretHex: WEB_SECRET });
  });

  it('imports with no secrets present and fails only when validated', () => {
    expect(() => validateRuntimeConfig({})).toThrow(/Invalid HELIOLYTICS_WEB_PASSWORD_HASH: missing/);
  });

  it('requires each field by name', () => {
    expect(failure({ ...validEnv, HELIOLYTICS_WEB_PASSWORD_HASH: undefined })).toMatch(/HELIOLYTICS_WEB_PASSWORD_HASH/);
    expect(failure({ ...validEnv, HELIOLYTICS_SESSION_SECRET: undefined })).toMatch(/HELIOLYTICS_SESSION_SECRET/);
    expect(failure({ ...validEnv, HELIOLYTICS_API_KEY: undefined })).toMatch(/HELIOLYTICS_API_KEY/);
    expect(failure({ ...validEnv, API_INTERNAL_URL: undefined })).toMatch(/API_INTERNAL_URL/);
  });

  it('rejects a plaintext or differently parameterised password verifier', () => {
    expect(failure({ ...validEnv, HELIOLYTICS_WEB_PASSWORD_HASH: 'hunter2' })).toMatch(/HELIOLYTICS_WEB_PASSWORD_HASH/);
    expect(
      failure({
        ...validEnv,
        HELIOLYTICS_WEB_PASSWORD_HASH: `scrypt$N=16384$r=8$p=3$${'11'.repeat(16)}$${'22'.repeat(32)}`,
      }),
    ).toMatch(/HELIOLYTICS_WEB_PASSWORD_HASH/);
    expect(
      failure({
        ...validEnv,
        HELIOLYTICS_WEB_PASSWORD_HASH: `scrypt$N=32768$r=8$p=1$${'11'.repeat(16)}$${'22'.repeat(32)}`,
      }),
    ).toMatch(/HELIOLYTICS_WEB_PASSWORD_HASH/);
  });

  it('rejects a malformed session secret', () => {
    expect(failure({ ...validEnv, HELIOLYTICS_SESSION_SECRET: SESSION_SECRET.toUpperCase() }))
      .toMatch(/HELIOLYTICS_SESSION_SECRET/);
    expect(failure({ ...validEnv, HELIOLYTICS_SESSION_SECRET: '3f'.repeat(16) }))
      .toMatch(/HELIOLYTICS_SESSION_SECRET/);
  });

  it('accepts only one web key and refuses a key ring', () => {
    expect(failure({ ...validEnv, HELIOLYTICS_API_KEY: `web.${WEB_SECRET.toUpperCase()}` }))
      .toMatch(/HELIOLYTICS_API_KEY/);
    expect(failure({ ...validEnv, HELIOLYTICS_API_KEY: `web.${WEB_SECRET.slice(1)}` }))
      .toMatch(/HELIOLYTICS_API_KEY/);
    expect(failure({ ...validEnv, HELIOLYTICS_API_KEY: `web.${WEB_SECRET},phone.${'6b'.repeat(32)}` }))
      .toMatch(/HELIOLYTICS_API_KEY/);
    expect(failure({ ...validEnv, HELIOLYTICS_API_KEY: `phone.${WEB_SECRET}` }))
      .toMatch(/kid must be web/);
  });

  it('refuses the published example secret', () => {
    const message = failure({ ...validEnv, HELIOLYTICS_API_KEY: `web.${EXAMPLE_SECRET_HEX}` });
    expect(message).toMatch(/published example secret/);
    expect(message).not.toContain(EXAMPLE_SECRET_HEX);
  });

  it('refuses a session secret equal to the web API key', () => {
    expect(failure({ ...validEnv, HELIOLYTICS_SESSION_SECRET: WEB_SECRET }))
      .toMatch(/must differ from the web API key/);
  });

  it('rejects an unusable API origin', () => {
    expect(failure({ ...validEnv, API_INTERNAL_URL: 'ftp://api:21' })).toMatch(/API_INTERNAL_URL/);
    expect(failure({ ...validEnv, API_INTERNAL_URL: 'not a url' })).toMatch(/API_INTERNAL_URL/);
    expect(failure({ ...validEnv, API_INTERNAL_URL: 'http://user:pass@api:8080' })).toMatch(/API_INTERNAL_URL/);
    expect(failure({ ...validEnv, API_INTERNAL_URL: 'http://api:8080?x=1' })).toMatch(/API_INTERNAL_URL/);
  });

  it('accepts only a root API origin without a path prefix', () => {
    const rootConfig = validateRuntimeConfig({
      ...validEnv,
      API_INTERNAL_URL: 'http://api:8080/',
    });
    expect(rootConfig.apiUrl).toBe('http://api:8080');

    for (const path of ['/prefix', '/prefix/', '/%61pi']) {
      expect(failure({ ...validEnv, API_INTERNAL_URL: `http://api:8080${path}` }))
        .toMatch(/API_INTERNAL_URL/);
    }
  });

  it('never silently defaults a malformed boolean', () => {
    expect(failure({ ...validEnv, TRUST_PROXY: 'yes' })).toMatch(/Invalid TRUST_PROXY/);
    expect(failure({ ...validEnv, COOKIE_SECURE: '1' })).toMatch(/Invalid COOKIE_SECURE/);
  });

  it('refuses an insecure production mode', () => {
    expect(failure({ ...validEnv, TRUST_PROXY: 'false' })).toMatch(/TRUST_PROXY: must be true in production/);
    expect(failure({ ...validEnv, COOKIE_SECURE: 'false' })).toMatch(/COOKIE_SECURE: must be true in production/);
  });

  it('accepts an explicit local development mode without claiming a trusted peer', () => {
    const config = validateRuntimeConfig({
      ...validEnv,
      NODE_ENV: 'development',
      TRUST_PROXY: 'false',
      COOKIE_SECURE: 'false',
    });
    expect(config.production).toBe(false);
    expect(config.trustProxy).toBe(false);
    expect(config.cookieSecure).toBe(false);
  });

  it('shares the verifier and key grammar with its callers', () => {
    expect(parsePasswordHash(PASSWORD_HASH)).toEqual({
      saltHex: '11'.repeat(16),
      hashHex: '22'.repeat(32),
    });
    expect(parsePasswordHash('scrypt$broken')).toBeNull();
    expect(parseApiKey(`web.${WEB_SECRET}`)).toEqual({ kid: 'web', secretHex: WEB_SECRET });
    expect(parseApiKey('web.short')).toBeNull();
    expect(parseApiKey('Web.'.concat(WEB_SECRET))).toBeNull();
  });
});
