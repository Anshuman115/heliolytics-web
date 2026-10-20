import { describe, expect, it } from 'vitest';
import {
  fetchActivities,
  fetchCoverage,
  fetchDays,
  fetchHeartRate,
  fetchSeries,
  fetchSleep,
  fetchTemperature,
} from '../lib/api';
import { sendApiRequest } from '../lib/api/client';
import { istRange } from '../lib/dates';

/**
 * Real-API gate. Prerequisites are required, never skipped: a missing or
 * non-loopback target fails the run instead of reporting a pass.
 */
const baseUrl = (process.env.HELIOLYTICS_TEST_API_URL ?? '').replace(/\/+$/, '');
const apiKey = process.env.HELIOLYTICS_TEST_API_KEY ?? '';

if (baseUrl === '') {
  throw new Error('HELIOLYTICS_TEST_API_URL is required for the live API suite');
}
if (apiKey === '') {
  throw new Error('HELIOLYTICS_TEST_API_KEY is required for the live API suite');
}
if (!/^web\.[0-9a-f]{64}$/.test(apiKey)) {
  throw new Error('HELIOLYTICS_TEST_API_KEY must be one web.<64 lowercase hex> key');
}

const target = new URL(baseUrl);
if (!['127.0.0.1', '::1', '[::1]'].includes(target.hostname)) {
  throw new Error('HELIOLYTICS_TEST_API_URL must use a loopback host (127.0.0.1 or ::1)');
}

process.env.API_INTERNAL_URL = baseUrl;
process.env.HELIOLYTICS_API_KEY = apiKey;

const RECENT = istRange(30);
const EMPTY = { from: '2000-01-01', to: '2000-01-02' };

// The web is read-only, so write paths are intentionally absent from the API
// module and named here only to prove the server refuses them.
const INGEST_PATH = '/api/v1/ingest';
const PROFILE_PATH = '/api/v1/profile';

function errorCode(json: unknown): string | null {
  if (typeof json !== 'object' || json === null || !('error' in json)) return null;
  const error = json.error;
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}

describe('live web API', () => {
  it('reads all seven routes with the expected shapes', async () => {
    const [days, sleep, activities, temperature, series, heartRate, coverage] = await Promise.all([
      fetchDays(RECENT),
      fetchSleep(RECENT),
      fetchActivities(RECENT),
      fetchTemperature(RECENT),
      fetchSeries(RECENT),
      fetchHeartRate(RECENT),
      fetchCoverage(),
    ]);

    expect(Array.isArray(days)).toBe(true);
    expect(Array.isArray(sleep)).toBe(true);
    expect(Array.isArray(activities)).toBe(true);
    expect(Array.isArray(temperature)).toBe(true);
    expect(Array.isArray(series)).toBe(true);
    expect(Array.isArray(heartRate)).toBe(true);
    expect(typeof coverage.hasData).toBe('boolean');
    expect(Object.keys(coverage.types)).toHaveLength(11);
    expect(Object.keys(coverage.types)).not.toContain('0x26');

    for (const day of days) {
      expect(day).toHaveProperty('dayKey');
      expect(day.readinessStatus).toBe(day.readinessComponents?.status ?? null);
      if (day.spo2Samples < 3) expect(day.spo2Avg).toBeNull();
    }
    for (const sleepDay of sleep) {
      expect(sleepDay).toHaveProperty('dayKey');
      expect(Array.isArray(sleepDay.naps)).toBe(true);
      if (sleepDay.main !== null) {
        expect(sleepDay.main.totalMins).toBeGreaterThan(0);
        expect(sleepDay.main.score).not.toBeNull();
      }
      for (const nap of sleepDay.naps) expect(nap.score).toBeNull();
    }
    for (const activity of activities) {
      expect(['workout', 'auto']).toContain(activity.kind);
      expect(activity.endedAt > activity.startedAt).toBe(true);
      if (activity.kind === 'auto') expect(['Walk', 'Run']).toContain(activity.sportName);
    }
    for (const sample of series) {
      expect(['hrv', 'stress', 'resp', 'spo2']).toContain(sample.metric);
    }
  });

  it('returns empty lists for a range with no data', async () => {
    expect(await fetchDays(EMPTY)).toEqual([]);
    expect(await fetchSleep(EMPTY)).toEqual([]);
    expect(await fetchActivities(EMPTY)).toEqual([]);
    expect(await fetchTemperature(EMPTY)).toEqual([]);
    expect(await fetchSeries(EMPTY)).toEqual([]);
    expect(await fetchHeartRate(EMPTY)).toEqual([]);
  });

  it('refuses a signed web ingest with 403 forbidden', async () => {
    const boundary = 'heliolytics-live-gate';
    const body = new TextEncoder().encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="probe"\r\n\r\nlive\r\n--${boundary}--\r\n`,
    );

    const response = await sendApiRequest(INGEST_PATH, {
      method: 'POST',
      body,
      contentType: `multipart/form-data; boundary=${boundary}`,
    });

    expect(response.status).toBe(403);
    expect(errorCode(response.json)).toBe('forbidden');
  });

  it('refuses a signed web profile write with 403 forbidden', async () => {
    const body = new TextEncoder().encode(
      '{"name":null,"birthDate":null,"sex":null,"heightCm":null,"weightKg":null}',
    );

    const response = await sendApiRequest(PROFILE_PATH, {
      method: 'PUT',
      body,
      contentType: 'application/json',
    });

    expect(response.status).toBe(403);
    expect(errorCode(response.json)).toBe('forbidden');
  });
});
