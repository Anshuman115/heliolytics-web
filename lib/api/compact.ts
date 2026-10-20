import type {
  CompactDay,
  HeartRateSample,
  SeriesDay,
  SeriesSample,
  TemperatureSample,
} from './types';

/** A response that does not match the documented wire contract. */
export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractError';
  }
}

export type ExpandedSample = { sampledAt: string; value: number };

const MAX_TIME_MS = 8_640_000_000_000_000;

/**
 * Expand one compact day into timestamped samples. Unequal offsets and values are a
 * contract error for the whole response; unusable points are dropped.
 */
export function expandCompactDay(day: CompactDay): ExpandedSample[] {
  if (!Array.isArray(day.offsets) || !Array.isArray(day.values)) {
    throw new ContractError(`contract error: ${day.dayKey} is not a compact day`);
  }
  if (day.offsets.length !== day.values.length) {
    throw new ContractError(
      `contract error: ${day.dayKey} has ${day.offsets.length} offsets and ${day.values.length} values`,
    );
  }
  const start = new Date(day.startTime).getTime();
  if (!Number.isFinite(start)) return [];

  const samples: ExpandedSample[] = [];
  for (let index = 0; index < day.offsets.length; index += 1) {
    const sampleTime = start + day.offsets[index] * 1000;
    const value = day.values[index];
    if (!Number.isFinite(sampleTime) || Math.abs(sampleTime) > MAX_TIME_MS) continue;
    if (!Number.isFinite(value)) continue;
    samples.push({ sampledAt: new Date(sampleTime).toISOString(), value });
  }
  return samples;
}

export function expandSeriesDays(days: SeriesDay[]): SeriesSample[] {
  return days.flatMap((day) =>
    expandCompactDay(day).map((sample) => ({
      metric: day.metric,
      dayKey: day.dayKey,
      sampledAt: sample.sampledAt,
      value: sample.value,
    })),
  );
}

export function expandTemperatureDays(days: CompactDay[]): TemperatureSample[] {
  return days.flatMap((day) =>
    expandCompactDay(day).map((sample) => ({
      dayKey: day.dayKey,
      sampledAt: sample.sampledAt,
      celsius: sample.value,
    })),
  );
}

export function expandHeartRateDays(days: CompactDay[]): HeartRateSample[] {
  return days.flatMap((day) =>
    expandCompactDay(day).map((sample) => ({
      dayKey: day.dayKey,
      sampledAt: sample.sampledAt,
      bpm: sample.value,
    })),
  );
}
