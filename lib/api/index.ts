import 'server-only';
import type { IstRange } from '@/lib/dates';
import { apiGet, type ApiFetcher } from './client';
import {
  ContractError,
  expandHeartRateDays,
  expandSeriesDays,
  expandTemperatureDays,
} from './compact';
import { API_ENDPOINTS } from './endpoints';
import type {
  Activity,
  CompactDay,
  Coverage,
  DayMetric,
  HeartRateSample,
  SeriesDay,
  SeriesSample,
  SleepDay,
  TemperatureSample,
} from './types';

export type FetchOptions = { fetcher?: ApiFetcher };

function readList<T>(path: string, body: unknown, field: string): T[] {
  if (typeof body !== 'object' || body === null || !(field in body)) {
    throw new ContractError(`contract error: ${path} response is missing ${field}`);
  }
  // Boundary assertion: the root is a JSON object and the key was just checked.
  const record = body as Record<string, unknown>;
  const value = record[field];
  if (!Array.isArray(value)) {
    throw new ContractError(`contract error: ${path} response field ${field} is not a list`);
  }
  return value;
}

function ranged(path: string, range: IstRange): string {
  return `${path}?from=${range.from}&to=${range.to}`;
}

export async function fetchDays(
  range: IstRange,
  options: FetchOptions = {},
): Promise<DayMetric[]> {
  const body = await apiGet(ranged(API_ENDPOINTS.days, range), options);
  return readList<DayMetric>(API_ENDPOINTS.days, body, 'days');
}

export async function fetchSleep(
  range: IstRange,
  options: FetchOptions = {},
): Promise<SleepDay[]> {
  const body = await apiGet(ranged(API_ENDPOINTS.sleep, range), options);
  return readList<SleepDay>(API_ENDPOINTS.sleep, body, 'days');
}

export async function fetchActivities(
  range: IstRange,
  options: FetchOptions = {},
): Promise<Activity[]> {
  const body = await apiGet(ranged(API_ENDPOINTS.activities, range), options);
  return readList<Activity>(API_ENDPOINTS.activities, body, 'activities');
}

export async function fetchTemperature(
  range: IstRange,
  options: FetchOptions = {},
): Promise<TemperatureSample[]> {
  const body = await apiGet(ranged(API_ENDPOINTS.temperature, range), options);
  return expandTemperatureDays(readList<CompactDay>(API_ENDPOINTS.temperature, body, 'days'));
}

export async function fetchSeries(
  range: IstRange,
  options: FetchOptions = {},
): Promise<SeriesSample[]> {
  const body = await apiGet(ranged(API_ENDPOINTS.series, range), options);
  return expandSeriesDays(readList<SeriesDay>(API_ENDPOINTS.series, body, 'days'));
}

export async function fetchHeartRate(
  range: IstRange,
  options: FetchOptions = {},
): Promise<HeartRateSample[]> {
  const body = await apiGet(ranged(API_ENDPOINTS.hr, range), options);
  return expandHeartRateDays(readList<CompactDay>(API_ENDPOINTS.hr, body, 'days'));
}

export async function fetchCoverage(options: FetchOptions = {}): Promise<Coverage> {
  const body = await apiGet(API_ENDPOINTS.coverage, options);
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ContractError('contract error: coverage response is not an object');
  }
  // Boundary assertion: the API returns a JSON object with the documented keys.
  const coverage = body as Record<string, unknown>;
  const hasData = coverage.hasData;
  if (typeof hasData !== 'boolean') {
    throw new ContractError('contract error: coverage response is missing hasData');
  }
  const rawTypes = coverage.types;
  if (typeof rawTypes !== 'object' || rawTypes === null || Array.isArray(rawTypes)) {
    throw new ContractError('contract error: coverage response is missing types');
  }
  const typeEntries = rawTypes as Record<string, unknown>;
  const types: Record<string, string | null> = {};
  for (const [code, value] of Object.entries(typeEntries)) {
    types[code] = typeof value === 'string' ? value : null;
  }
  return {
    hasData,
    lastIngestAt: typeof coverage.lastIngestAt === 'string' ? coverage.lastIngestAt : null,
    dataThrough: typeof coverage.dataThrough === 'string' ? coverage.dataThrough : null,
    types,
  };
}
