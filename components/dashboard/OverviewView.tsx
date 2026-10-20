import type { DayMetric, SeriesSample } from '@/lib/api/types';
import { HeroRings } from '@/components/HeroRings';
import { Stat } from '@/components/ui/Stat';
import { StepsChart } from '@/components/charts/StepsChart';
import { VitalsSeriesChart } from '@/components/charts/VitalsSeriesChart';
import { averageKnown, formatNumber, knownStepTotal } from '@/lib/dashboard';
import { DailyInsight } from './DailyInsight';
import { ReadinessDetails } from './ReadinessDetails';

export function OverviewView({
  dayKey,
  day,
  days,
  series,
  isToday,
}: {
  dayKey: string | null;
  day?: DayMetric;
  days: DayMetric[];
  series: SeriesSample[];
  isToday: boolean;
}) {
  const steps = knownStepTotal(days);
  const readinessAvg = formatNumber(averageKnown(days.map((item) => item.readiness)), 0);
  const sleepAvg = formatNumber(averageKnown(days.map((item) => item.sleepScore)), 0);
  const stressAvg = formatNumber(averageKnown(days.map((item) => item.stressAvg)), 0);
  const pai = formatNumber(day?.paiScore, 0);
  const load = formatNumber(day?.trainingLoad, 1);
  const calories = formatNumber(day?.workoutCalories, 0);
  const stepTotal = formatNumber(steps.total, 0);

  return (
    <>
      <HeroRings day={day} dayKey={dayKey} isToday={isToday} />
      <DailyInsight day={day} />
      <ReadinessDetails day={day} />
      <div className="mb-6 grid gap-4 fade-up sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={steps.partial ? 'Total steps (partial)' : 'Total steps'}
          value={steps.knownDays === 0 ? 'No step data' : stepTotal ?? '0'}
          accent="#009de5"
        />
        <Stat label="Avg readiness" value={readinessAvg ?? 'n/a'} accent="#00e6a3" />
        <Stat label="Avg sleep score" value={sleepAvg ?? 'n/a'} accent="#7fa8c2" />
        <Stat label="Avg stress" value={stressAvg ?? 'n/a'} accent="#ffd400" />
      </div>
      {day ? (
        <div className="mb-6 grid gap-4 fade-up sm:grid-cols-3">
          <Stat label="PAI" value={pai === null ? 'n/a' : `${pai} pts`} accent="#009de5" />
          <Stat label="Training load" value={load === null ? 'n/a' : `${load} TRIMP`} accent="#a78bfa" />
          <Stat label="Workout calories" value={calories === null ? 'n/a' : `${calories} kcal`} accent="#30d158" />
        </div>
      ) : null}
      <p className="mb-6 text-xs leading-5 text-slate-500">
        PAI is a device activity goal scored out of 100 points, not a readiness score. Training load is
        TRIMP from recorded heart rate. Workout calories cover recorded workouts only, not total daily burn.
      </p>
      <div className="grid gap-4 fade-up lg:grid-cols-2">
        <StepsChart days={days} />
        <VitalsSeriesChart samples={series} />
      </div>
    </>
  );
}
