#!/usr/bin/env node

import { randomBytes, scrypt as nodeScrypt } from 'node:crypto';
import { promisify } from 'node:util';
import {
  PASSWORD_MAX_BYTES,
  SCRYPT_KEY_LENGTH,
  SCRYPT_MAX_MEMORY,
  SCRYPT_N,
  SCRYPT_P,
  SCRYPT_R,
  encodePasswordHash,
} from '../lib/auth/runtime_config.mjs';

const scrypt = promisify(nodeScrypt);

async function readHidden(prompt) {
  if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal.');
  process.stderr.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stderr.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') return finish(new Error('Cancelled.'));
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u007f' || character === '\b') {
          value = Array.from(value).slice(0, -1).join('');
        } else {
          value += character;
        }
      }
    };
    process.stdin.on('data', onData);
  });
}

try {
  const password = await readHidden('Password: ');
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    throw new Error(`Password exceeds ${PASSWORD_MAX_BYTES} UTF-8 bytes.`);
  }
  const confirmation = await readHidden('Confirm password: ');
  if (password !== confirmation) throw new Error('Passwords do not match.');

  const salt = randomBytes(16);
  const hash = await scrypt(Buffer.from(password, 'utf8'), salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAX_MEMORY,
  });
  process.stdout.write(`${encodePasswordHash(salt.toString('hex'), hash.toString('hex'))}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
