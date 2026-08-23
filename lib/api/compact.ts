import type {
  SeriesDayCompact,
  SeriesSample,
  TemperatureDayCompact,
  TemperatureSample,
} from './types';

function sampleTimes(startTime: string, offsets: number[], values: number[]) {
  const start = new Date(startTime).getTime();
  if (!Number.isFinite(start)) return [];

  const samples: Array<{ sampledAt: string; value: number }> = [];
  const count = Math.min(offsets.length, values.length);
  for (let index = 0; index < count; index++) {
    const offset = offsets[index];
    const value = values[index];
    if (!Number.isFinite(offset) || !Number.isFinite(value)) continue;
    samples.push({
      sampledAt: new Date(start + offset * 1000).toISOString(),
      value,
    });
  }
  return samples;
}

export function flattenSeriesDays(days: SeriesDayCompact[]): SeriesSample[] {
  return days.flatMap((day) =>
    sampleTimes(day.startTime, day.offsets ?? [], day.values ?? []).map((sample) => ({
      metric: day.metric,
      dayKey: day.dayKey,
      ...sample,
    })),
  );
}

export function flattenTemperatureDays(
  days: TemperatureDayCompact[],
): TemperatureSample[] {
  return days.flatMap((day) =>
    sampleTimes(day.startTime, day.offsets ?? [], day.values ?? []).map((sample) => ({
      dayKey: day.dayKey,
      sampledAt: sample.sampledAt,
      celsius: sample.value,
    })),
  );
}
