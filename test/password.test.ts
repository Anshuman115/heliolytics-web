import { randomBytes, scryptSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MAX_BYTES,
  SCRYPT_N,
  SCRYPT_P,
  SCRYPT_R,
  verifyPassword,
} from '../lib/auth/password';

function encode(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(Buffer.from(password, 'utf8'), salt, 32, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 128 * 1024 * 1024,
  });
  return `scrypt$N=${SCRYPT_N}$r=${SCRYPT_R}$p=${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

describe('password verification', () => {
  it('accepts only the exact password', async () => {
    const encoded = encode(' exact password ');
    await expect(verifyPassword(' exact password ', encoded)).resolves.toBe(true);
    await expect(verifyPassword('exact password', encoded)).resolves.toBe(false);
  });

  it('rejects malformed hashes', async () => {
    await expect(verifyPassword('password', 'scrypt$broken')).resolves.toBe(false);
  });

  it('rejects passwords above the UTF-8 byte limit', async () => {
    const tooLong = 'é'.repeat(PASSWORD_MAX_BYTES / 2 + 1);
    await expect(verifyPassword(tooLong, encode('unused'))).resolves.toBe(false);
  });
});
