import { describe, expect, it } from 'vitest';
import { flattenSeriesDays, flattenTemperatureDays } from '../lib/api/compact';
import { API_ENDPOINTS } from '../lib/api/endpoints';

describe('Go API contracts', () => {
  it('uses the routes registered by the Go API', () => {
    expect(API_ENDPOINTS.days).toBe('/api/v1/daily-metrics');
    expect(API_ENDPOINTS.sleep).toBe('/api/v1/sleep');
  });

  it('flattens compact health-series days and pairs only complete samples', () => {
    expect(flattenSeriesDays([{
      metric: 'stress',
      dayKey: '2026-08-23',
      startTime: '2026-08-23T00:00:00.000Z',
      offsets: [0, 60, 120],
      values: [20, 30],
    }])).toEqual([
      { metric: 'stress', dayKey: '2026-08-23', sampledAt: '2026-08-23T00:00:00.000Z', value: 20 },
      { metric: 'stress', dayKey: '2026-08-23', sampledAt: '2026-08-23T00:01:00.000Z', value: 30 },
    ]);
  });

  it('flattens compact temperature days', () => {
    expect(flattenTemperatureDays([{
      dayKey: '2026-08-23',
      startTime: '2026-08-23T00:00:00.000Z',
      offsets: [30],
      values: [34.25],
    }])).toEqual([
      { dayKey: '2026-08-23', sampledAt: '2026-08-23T00:00:30.000Z', celsius: 34.25 },
    ]);
  });

  it('drops blocks with invalid start times', () => {
    expect(flattenSeriesDays([{
      metric: 'hrv',
      dayKey: '2026-08-23',
      startTime: 'invalid',
      offsets: [0],
      values: [50],
    }])).toEqual([]);
  });
});
