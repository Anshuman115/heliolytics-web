import { describe, expect, it } from 'vitest';
import {
  createSessionValue,
  renewSessionValue,
  SESSION_ABSOLUTE_SEC,
  SESSION_IDLE_SEC,
  verifySessionValue,
} from '../lib/auth/session';

const secret = '11'.repeat(32);
const now = 1_800_000_000;

describe('browser sessions', () => {
  it('creates and verifies a v1 session', async () => {
    const token = await createSessionValue(secret, now);
    expect(token).toMatch(/^v1\.\d+\.\d+\.[0-9a-f]{64}$/);
    await expect(verifySessionValue(token!, secret, now + 1)).resolves.toMatchObject({
      valid: true,
      issuedAt: now,
      expiresAt: now + SESSION_IDLE_SEC,
    });
  });

  it('rejects old, malformed, expired, and wrongly signed cookies', async () => {
    const token = await createSessionValue(secret, now);
    await expect(verifySessionValue('123.signature', secret, now)).resolves.toEqual({ valid: false });
    await expect(verifySessionValue(token!, undefined, now)).resolves.toEqual({ valid: false });
    await expect(verifySessionValue(token!, '22'.repeat(32), now)).resolves.toEqual({ valid: false });
    await expect(verifySessionValue(token!, secret, now + SESSION_IDLE_SEC)).resolves.toEqual({ valid: false });
  });

  it('renews near expiry without changing issuedAt', async () => {
    const token = await createSessionValue(secret, now);
    const renewalAt = now + SESSION_IDLE_SEC - 60;
    const session = await verifySessionValue(token!, secret, renewalAt);
    const renewal = await renewSessionValue(session, secret, renewalAt);

    expect(renewal).not.toBeNull();
    const renewed = await verifySessionValue(renewal!.value, secret, renewalAt);
    expect(renewed.issuedAt).toBe(now);
    expect(renewed.expiresAt).toBe(renewalAt + SESSION_IDLE_SEC);
  });

  it('caps renewal at the 30-day absolute expiry', async () => {
    const token = await createSessionValue(secret, now);
    const initial = await verifySessionValue(token!, secret, now + SESSION_IDLE_SEC - 1);
    const firstRenewal = await renewSessionValue(initial, secret, now + SESSION_IDLE_SEC - 1);
    const late = now + SESSION_ABSOLUTE_SEC - 60;
    const lateSession = {
      valid: true,
      issuedAt: now,
      expiresAt: late + 30,
    };
    const finalRenewal = await renewSessionValue(lateSession, secret, late);

    expect(firstRenewal).not.toBeNull();
    expect(finalRenewal?.maxAge).toBe(60);
    const verified = await verifySessionValue(finalRenewal!.value, secret, late);
    expect(verified.expiresAt).toBe(now + SESSION_ABSOLUTE_SEC);
  });
});
