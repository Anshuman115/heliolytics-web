import { scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import {
  PASSWORD_MAX_BYTES,
  SCRYPT_KEY_LENGTH,
  SCRYPT_MAX_MEMORY,
  SCRYPT_N,
  SCRYPT_P,
  SCRYPT_R,
  parsePasswordHash,
} from './runtime_config.mjs';

export { PASSWORD_MAX_BYTES, SCRYPT_N, SCRYPT_R, SCRYPT_P };

function deriveKey(password: Buffer, salt: Buffer): Promise<Buffer> {
  const { promise, resolve, reject } = Promise.withResolvers<Buffer>();
  nodeScrypt(
    password,
    salt,
    SCRYPT_KEY_LENGTH,
    {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: SCRYPT_MAX_MEMORY,
    },
    (error, key) => {
      if (error) reject(error);
      else resolve(key);
    },
  );
  return promise;
}

export async function verifyPassword(
  password: string,
  encoded: string | undefined,
): Promise<boolean> {
  const passwordBytes = Buffer.from(password, 'utf8');
  if (passwordBytes.length > PASSWORD_MAX_BYTES || !encoded) return false;
  const parsed = parsePasswordHash(encoded);
  if (!parsed) return false;
  try {
    const derived = await deriveKey(passwordBytes, Buffer.from(parsed.saltHex, 'hex'));
    return timingSafeEqual(derived, Buffer.from(parsed.hashHex, 'hex'));
  } catch {
    return false;
  }
}
