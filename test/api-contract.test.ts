import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchActivities,
  fetchCoverage,
  fetchDays,
  fetchHeartRate,
  fetchSeries,
  fetchSleep,
  fetchTemperature,
} from '../lib/api';
import type { ApiFetcher } from '../lib/api/client';
import { ContractError, expandCompactDay } from '../lib/api/compact';
import { istRange } from '../lib/dates';

const RANGE = istRange(30, new Date('2026-10-19T00:00:00Z'));

beforeEach(() => {
  vi.stubEnv('HELIOLYTICS_WEB_API_KEY', `web.${'ef'.repeat(32)}`);
  vi.stubEnv('API_INTERNAL_URL', 'http://127.0.0.1:8080');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function routingFetcher(overrides: Record<string, unknown> = {}): {
  fetcher: ApiFetcher;
  urls: string[];
} {
  const urls: string[] = [];
  const fetcher: ApiFetcher = async (url) => {
    urls.push(url);
    for (const [fragment, body] of Object.entries(overrides)) {
      if (url.includes(fragment)) return jsonResponse(body);
    }
    if (url.includes('/metrics/coverage')) {
      return jsonResponse({ hasData: false, lastIngestAt: null, dataThrough: null, types: {} });
    }
    if (url.includes('/api/activities')) return jsonResponse({ activities: [] });
    return jsonResponse({ days: [] });
  };
  return { fetcher, urls };
}

describe('wire contract', () => {
  it('reads sleep days from the days list', async () => {
    const { fetcher, urls } = routingFetcher({ '/api/sleep': { days: [] } });
    await expect(fetchSleep(RANGE, { fetcher })).resolves.toEqual([]);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain(`/api/sleep?from=${RANGE.from}&to=${RANGE.to}`);
  });

  it('reads activities from the activities list', async () => {
    const { fetcher } = routingFetcher({ '/api/activities': { activities: [] } });
    await expect(fetchActivities(RANGE, { fetcher })).resolves.toEqual([]);
  });

  it('keeps main and naps distinct and preserves stored detail', async () => {
    const main = {
      startedAt: '2026-10-17T18:40:00Z',
      endedAt: '2026-10-18T01:00:00Z',
      score: 76,
      totalMins: 420,
      deepMins: 90,
      remMins: 110,
      lightMins: 220,
      wakeMins: 0,
      stagesTruncated: false,
      stages: [{ start: '2026-10-17T18:40:00Z', end: '2026-10-17T19:10:00Z', type: 5 }],
    };
    const nap = {
      startedAt: '2026-10-18T10:00:00Z',
      endedAt: '2026-10-18T10:45:00Z',
      score: null,
      totalMins: 45,
      deepMins: 5,
      remMins: 10,
      lightMins: 30,
      wakeMins: 0,
      stagesTruncated: false,
      stages: [],
    };
    const { fetcher } = routingFetcher({
      '/api/sleep': { days: [{ dayKey: '2026-10-18', main, naps: [nap] }] },
    });

    const days = await fetchSleep(RANGE, { fetcher });
    expect(days).toHaveLength(1);
    expect(days[0].main?.score).toBe(76);
    expect(days[0].main?.totalMins).toBe(420);
    expect(days[0].naps).toHaveLength(1);
    expect(days[0].naps[0].score).toBeNull();
  });

  it('returns both activity kinds without deduplicating them', async () => {
    const shared = {
      dayKey: '2026-10-18',
      startedAt: '2026-10-18T00:00:00Z',
      endedAt: '2026-10-18T01:00:00Z',
      durationSec: 3600,
      sportType: 1,
      sportName: 'Run',
      calories: null,
      avgHr: 140,
      maxHr: 170,
      minHr: 90,
      steps: 0,
      hasDetail: true,
    };
    const { fetcher } = routingFetcher({
      '/api/activities': {
        activities: [
          { ...shared, kind: 'workout' },
          { ...shared, kind: 'auto', sportName: 'Walk', calories: null, hasDetail: false },
        ],
      },
    });

    const activities = await fetchActivities(RANGE, { fetcher });
    expect(activities).toHaveLength(2);
    expect(activities.map((activity) => `${activity.kind}|${activity.startedAt}`)).toEqual([
      'workout|2026-10-18T00:00:00Z',
      'auto|2026-10-18T00:00:00Z',
    ]);
  });

  it('flattens compact temperature days with the day key intact', async () => {
    const { fetcher } = routingFetcher({
      '/api/metrics/temperature': {
        days: [
          {
            dayKey: '2026-10-18',
            startTime: '2026-10-18T18:30:00Z',
            offsets: [0, 60],
            values: [33.27, 33.31],
          },
        ],
      },
    });

    const samples = await fetchTemperature(RANGE, { fetcher });
    expect(samples).toEqual([
      { dayKey: '2026-10-18', sampledAt: '2026-10-18T18:30:00.000Z', celsius: 33.27 },
      { dayKey: '2026-10-18', sampledAt: '2026-10-18T18:31:00.000Z', celsius: 33.31 },
    ]);
  });

  it('rejects a malformed root or list instead of inventing an empty screen', async () => {
    await expect(
      fetchSleep(RANGE, { fetcher: routingFetcher({ '/api/sleep': [] }).fetcher }),
    ).rejects.toBeInstanceOf(ContractError);
    await expect(
      fetchDays(RANGE, { fetcher: routingFetcher({ '/api/daily-metrics': { days: {} } }).fetcher }),
    ).rejects.toBeInstanceOf(ContractError);
    await expect(
      fetchActivities(RANGE, { fetcher: routingFetcher({ '/api/activities': { rows: [] } }).fetcher }),
    ).rejects.toBeInstanceOf(ContractError);
    await expect(
      fetchCoverage({ fetcher: routingFetcher({ '/metrics/coverage': { types: {} } }).fetcher }),
    ).rejects.toBeInstanceOf(ContractError);
  });

  it('makes exactly seven signed reads per dashboard load', async () => {
    const { fetcher, urls } = routingFetcher();

    await Promise.all([
      fetchDays(RANGE, { fetcher }),
      fetchSleep(RANGE, { fetcher }),
      fetchActivities(RANGE, { fetcher }),
      fetchTemperature(RANGE, { fetcher }),
      fetchSeries(RANGE, { fetcher }),
      fetchHeartRate(RANGE, { fetcher }),
      fetchCoverage({ fetcher }),
    ]);

    expect(urls).toHaveLength(7);
    const ranged = urls.filter((url) => !url.includes('/metrics/coverage'));
    expect(ranged).toHaveLength(6);
    for (const url of ranged) {
      expect(url).toContain(`from=${RANGE.from}&to=${RANGE.to}`);
    }
    expect(urls.filter((url) => url.includes('/api/activities'))).toHaveLength(1);
    for (const deleted of [
      '/daily-health-scores',
      '/metrics/workouts',
      '/metrics/activity-sessions',
      '/metrics/hrv',
      '/metrics/rhr',
      '/metrics/vo2max',
      '/recovery',
      '/strain',
    ]) {
      expect(urls.some((url) => url.includes(deleted))).toBe(false);
    }
  });
});

describe('compact day expansion', () => {
  it('rejects unequal lengths for the whole response', () => {
    expect(() =>
      expandCompactDay({
        dayKey: '2026-10-18',
        startTime: '2026-10-18T18:30:00Z',
        offsets: [0, 60, 120],
        values: [20, 30],
      }),
    ).toThrow(ContractError);
  });

  it('drops unusable points without overflowing the clock', () => {
    expect(
      expandCompactDay({
        dayKey: '2026-10-18',
        startTime: 'invalid',
        offsets: [0],
        values: [20],
      }),
    ).toEqual([]);
    expect(
      expandCompactDay({
        dayKey: '2026-10-18',
        startTime: '2026-10-18T18:30:00Z',
        offsets: [Number.NaN, 60],
        values: [20, 30],
      }),
    ).toEqual([{ sampledAt: '2026-10-18T18:31:00.000Z', value: 30 }]);
  });
});
