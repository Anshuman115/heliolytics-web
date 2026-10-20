import type { DayMetric } from '@/lib/api/types';
import { formatMinutes } from '@/lib/dashboard';

/**
 * Neutral description of the selected day. It restates stored values and the
 * stored readiness status; it never claims capacity, injury or illness, and it
 * gives no training recommendation.
 */
export function DailyInsight({ day }: { day?: DayMetric }) {
  if (!day) return null;

  const components = day.readinessComponents;
  const nights = components?.baselineNights ?? 0;
  const title =
    day.readinessStatus === 'scored'
      ? day.readiness === null
        ? 'Readiness scored'
        : `Readiness ${Math.round(day.readiness)} of 100`
      : day.readinessStatus === 'calibrating'
        ? 'Readiness is calibrating'
        : day.readinessStatus === 'no_baseline'
          ? 'Not enough recent baseline nights'
          : day.readinessStatus === 'no_data'
            ? 'Insufficient nightly HRV'
            : 'Readiness unavailable';
  const copy =
    day.readinessStatus === 'scored'
      ? `Scored against your own baseline. Sleep was ${formatMinutes(day.sleepMins)} and training load is ${day.trainingLoad === null ? 'unavailable' : `TRIMP ${day.trainingLoad.toFixed(1)}`}.`
      : day.readinessStatus === 'calibrating'
        ? `${nights} baseline nights recorded. A score appears once 14 nights of valid data exist.`
        : day.readinessStatus === 'no_baseline'
          ? `The stored baseline cannot be used for this date (${nights} baseline nights recorded).`
          : day.readinessStatus === 'no_data'
            ? 'Readiness needs nightly HRV from the main sleep window, and this date has too little.'
            : 'No stored readiness exists for this date, so no score is shown.';

  return (
    <section className="card mb-6 flex items-start gap-4 p-5 sm:p-6">
      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-xl text-sky-200" aria-hidden="true">✦</span>
      <div>
        <p className="eyebrow mb-1">Daily read</p>
        <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">{copy}</p>
      </div>
    </section>
  );
}
