import { DashboardApp } from '@/components/dashboard/DashboardApp';
import { SyncStatusBar } from '@/components/SyncStatusBar';
import {
  fetchActivities,
  fetchCoverage,
  fetchDays,
  fetchHeartRate,
  fetchSeries,
  fetchSleep,
  fetchTemperature,
} from '@/lib/api';
import type {
  Activity,
  Coverage,
  DayMetric,
  HeartRateSample,
  SeriesSample,
  SleepDay,
  TemperatureSample,
} from '@/lib/api/types';
import { SNAPSHOT_DAYS } from '@/lib/dashboard';
import { istRange } from '@/lib/dates';

export const dynamic = 'force-dynamic';

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'request failed';
}

export default async function HomePage() {
  // One IST snapshot window, shared by all six ranged reads.
  const range = istRange(SNAPSHOT_DAYS);
  const errors: string[] = [];
  let days: DayMetric[] = [];
  let sleep: SleepDay[] = [];
  let activities: Activity[] = [];
  let temperature: TemperatureSample[] = [];
  let series: SeriesSample[] = [];
  let heartRate: HeartRateSample[] = [];
  let coverage: Coverage | null = null;
  let coverageError: string | undefined;

  await Promise.all([
    fetchDays(range).then((data) => { days = data; }).catch((error) => {
      errors.push(`Days: ${describe(error)}`);
    }),
    fetchSleep(range).then((data) => { sleep = data; }).catch((error) => {
      errors.push(`Sleep: ${describe(error)}`);
    }),
    fetchActivities(range).then((data) => { activities = data; }).catch((error) => {
      errors.push(`Activities: ${describe(error)}`);
    }),
    fetchTemperature(range).then((data) => { temperature = data; }).catch((error) => {
      errors.push(`Temperature: ${describe(error)}`);
    }),
    fetchSeries(range).then((data) => { series = data; }).catch((error) => {
      errors.push(`Series: ${describe(error)}`);
    }),
    fetchHeartRate(range).then((data) => { heartRate = data; }).catch((error) => {
      errors.push(`Heart rate: ${describe(error)}`);
    }),
    fetchCoverage().then((data) => { coverage = data; }).catch((error) => {
      coverageError = describe(error);
    }),
  ]);

  return (
    <main className="page-shell">
      <SyncStatusBar coverage={coverage} error={coverageError} />

      {errors.length > 0 ? (
        <div className="mb-6 space-y-2 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-amber-100">
          <p className="font-bold">Some signals are unavailable</p>
          {errors.map((entry) => (
            <p key={entry} className="text-sm text-amber-200/90">
              {entry}
            </p>
          ))}
        </div>
      ) : null}

      <DashboardApp
        days={days}
        sleep={sleep}
        activities={activities}
        temperature={temperature}
        series={series}
        heartRate={heartRate}
      />
    </main>
  );
}
