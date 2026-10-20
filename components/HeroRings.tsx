import type { DayMetric } from '@/lib/api/types';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { formatNumber } from '@/lib/dashboard';
import { formatDayKey } from '@/lib/dates';

function readinessColor(band: DayMetric['readinessBand']): string {
  if (band === 'good') return '#00e6a3';
  if (band === 'fair') return '#ffd400';
  if (band === 'low') return '#ff003c';
  return '#707b81';
}

export function HeroRings({
  day,
  dayKey,
  isToday,
}: {
  day?: DayMetric;
  dayKey: string | null;
  isToday: boolean;
}) {
  if (!day || dayKey === null) return <EmptyOverview />;

  const readinessLabel =
    day.readinessStatus === 'scored'
      ? 'Scored'
      : day.readinessStatus === 'calibrating'
        ? 'Calibrating'
        : null;
  const stepGoal = 10000;
  const steps = day.steps;

  return (
    <section className="card grid-surface mb-6 overflow-hidden p-5 sm:p-7">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">{isToday ? 'Today' : 'Selected day'}</p>
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{formatDayKey(dayKey, 'long')}</h2>
        </div>
        <p className="text-sm text-slate-400">
          {readinessLabel ? (
            <span className="mr-2 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-200">{readinessLabel}</span>
          ) : null}
          Persisted values for this day.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-3">
        <div className="flex items-center justify-center rounded-2xl bg-black/10 py-4 sm:py-5">
          <ScoreRing value={day.sleepScore} label="Sleep" color="#7fa8c2" sub="score" />
        </div>
        <div className="flex items-center justify-center rounded-2xl bg-black/10 py-4 sm:py-5">
          <ScoreRing value={day.readiness} label="Readiness" color={readinessColor(day.readinessBand)} sub="readiness" />
        </div>
        <div className="flex items-center justify-center rounded-2xl bg-black/10 py-4 sm:py-5">
          <ScoreRing value={day.paiScore} label="PAI" color="#009de5" sub="points" />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm">
        {steps === null ? (
          <span className="text-slate-400">No step data for this day.</span>
        ) : (
          <>
            <span className="text-slate-400">Movement goal <strong className="text-white">{formatNumber(steps, 0)} / {formatNumber(stepGoal, 0)} steps</strong></span>
            <span className="font-semibold text-emerald-200">{Math.round((steps / stepGoal) * 100)}% complete</span>
          </>
        )}
      </div>
    </section>
  );
}

function EmptyOverview() {
  return <section className="card mb-6 p-10 text-center text-sm text-slate-400">No daily record for this day.</section>;
}
