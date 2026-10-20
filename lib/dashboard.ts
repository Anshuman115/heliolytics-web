import type {
  Activity,
  DayMetric,
  SeriesMetric,
  SeriesSample,
  SleepDay,
} from '@/lib/api/types';

/** Days requested by one dashboard snapshot, matching the API default window. */
export const SNAPSHOT_DAYS = 30;

/** Ranges the dashboard can show without another API call. */
export const DASHBOARD_RANGES = [7, 30] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export type StepTotal = { total: number; knownDays: number; partial: boolean };

export type DailySeriesMean = {
  dayKey: string;
  metric: SeriesMetric;
  value: number;
  count: number;
};

export type SleepStageRow = {
  dayKey: string;
  deep: number | null;
  rem: number | null;
  light: number | null;
  wake: number | null;
  total: number | null;
};

/** Every day the dashboard can select, from daily rows, sleep days and activities. */
export function collectDayKeys(
  days: DayMetric[],
  sleepDays: SleepDay[],
  activities: Activity[],
): string[] {
  const keys = new Set<string>();
  for (const day of days) keys.add(day.dayKey);
  for (const day of sleepDays) keys.add(day.dayKey);
  for (const activity of activities) keys.add(activity.dayKey);
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

/**
 * Keep the requested day only while it belongs to the visible range, otherwise
 * move to the latest key in that range. Never falls back to another day's data.
 */
export function resolveSelection(keys: string[], requested: string | null): string | null {
  if (keys.length === 0) return null;
  if (requested !== null && keys.includes(requested)) return requested;
  return keys[keys.length - 1];
}

/** Sum known step days and mark the total partial when any day is unknown. */
export function knownStepTotal(days: DayMetric[]): StepTotal {
  let total = 0;
  let knownDays = 0;
  for (const day of days) {
    if (day.steps === null) continue;
    total += day.steps;
    knownDays += 1;
  }
  return { total, knownDays, partial: knownDays < days.length };
}

export function averageKnown(values: (number | null | undefined)[]): number | null {
  let sum = 0;
  let count = 0;
  for (const value of values) {
    if (value === null || value === undefined) continue;
    sum += value;
    count += 1;
  }
  return count === 0 ? null : sum / count;
}

/** Split the single activities response by kind without deduplicating anything. */
export function splitActivities(activities: Activity[]): {
  workouts: Activity[];
  auto: Activity[];
} {
  const workouts: Activity[] = [];
  const auto: Activity[] = [];
  for (const activity of activities) {
    if (activity.kind === 'workout') workouts.push(activity);
    else auto.push(activity);
  }
  return { workouts, auto };
}

/**
 * Daily mean per metric, grouped by the full day key so the same month and day
 * in different years stay separate. Days below `minimumSamples` are omitted.
 */
export function dailySeriesMeans(
  samples: SeriesSample[],
  minimumSamples = 1,
): DailySeriesMean[] {
  const buckets = new Map<
    string,
    { dayKey: string; metric: SeriesMetric; sum: number; count: number }
  >();
  for (const sample of samples) {
    if (!Number.isFinite(sample.value)) continue;
    const bucketKey = `${sample.dayKey}|${sample.metric}`;
    const bucket = buckets.get(bucketKey);
    if (bucket) {
      bucket.sum += sample.value;
      bucket.count += 1;
    } else {
      buckets.set(bucketKey, {
        dayKey: sample.dayKey,
        metric: sample.metric,
        sum: sample.value,
        count: 1,
      });
    }
  }
  const means: DailySeriesMean[] = [];
  buckets.forEach((bucket) => {
    if (bucket.count < minimumSamples) return;
    means.push({
      dayKey: bucket.dayKey,
      metric: bucket.metric,
      value: bucket.sum / bucket.count,
      count: bucket.count,
    });
  });
  return means.sort(
    (a, b) => a.dayKey.localeCompare(b.dayKey) || a.metric.localeCompare(b.metric),
  );
}

/** Daily sleep rollup totals for the trend chart; days without a rollup are gaps. */
export function sleepStageRows(days: DayMetric[]): SleepStageRow[] {
  return days
    .filter((day) => day.sleepMins !== null)
    .map((day) => ({
      dayKey: day.dayKey,
      deep: day.sleepDeepMins,
      rem: day.sleepRemMins,
      light: day.sleepLightMins,
      wake: day.sleepWakeMins,
      total: day.sleepMins,
    }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));
}

/** `0m` stays 0 minutes; only an unknown value is `n/a`. */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return 'n/a';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}

/** Display rounding only; null and undefined stay null so callers can say `n/a`. */
export function formatNumber(
  value: number | null | undefined,
  maximumFractionDigits: number,
): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}
