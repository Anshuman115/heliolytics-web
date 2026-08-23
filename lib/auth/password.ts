import { scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';

export const PASSWORD_MAX_BYTES = 256;
export const SCRYPT_N = 32768;
export const SCRYPT_R = 8;
export const SCRYPT_P = 3;
const SCRYPT_KEY_LENGTH = 32;
const SCRYPT_MAX_MEMORY = 128 * 1024 * 1024;

type ParsedPasswordHash = {
  salt: Buffer;
  hash: Buffer;
};

function deriveKey(password: Buffer, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
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
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

function parsePasswordHash(encoded: string): ParsedPasswordHash | null {
  const parts = encoded.split('$');
  if (
    parts.length !== 6 ||
    parts[0] !== 'scrypt' ||
    parts[1] !== `N=${SCRYPT_N}` ||
    parts[2] !== `r=${SCRYPT_R}` ||
    parts[3] !== `p=${SCRYPT_P}` ||
    !/^[0-9a-f]{32}$/.test(parts[4] ?? '') ||
    !/^[0-9a-f]{64}$/.test(parts[5] ?? '')
  ) {
    return null;
  }
  return {
    salt: Buffer.from(parts[4]!, 'hex'),
    hash: Buffer.from(parts[5]!, 'hex'),
  };
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
    const derived = await deriveKey(passwordBytes, parsed.salt);
    return timingSafeEqual(derived, parsed.hash);
  } catch {
    return false;
  }
}
