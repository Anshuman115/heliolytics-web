import type { Activity, ActivityKind } from '@/lib/api/types';
import { formatMinutes, formatNumber } from '@/lib/dashboard';
import { formatIstInstant } from '@/lib/dates';

const KIND_DISPLAY: Record<ActivityKind, { title: string; badge: string; note: string }> = {
  workout: {
    title: 'Recorded workout',
    badge: 'Workout',
    note: 'Workouts recorded by the strap. Every stored field is shown; nothing is inferred here.',
  },
  auto: {
    title: 'Automatically detected movement',
    badge: 'Automatic',
    note: 'Heuristic sustained movement from step and heart-rate minutes, not a recorded sport. The Walk or Run label is the server label, not a vendor sport.',
  },
};

export function ActivitySessionsList({
  activities,
  kind,
}: {
  activities: Activity[];
  kind: ActivityKind;
}) {
  const display = KIND_DISPLAY[kind];
  const rows = activities.filter((activity) => activity.kind === kind);

  if (rows.length === 0) {
    return (
      <section className="card mb-6 p-6 text-sm text-slate-400">
        <p className="label">{display.title}</p>
        <p className="mt-1">Nothing stored for this kind in the selected range.</p>
      </section>
    );
  }

  return (
    <section className="card mb-6 divide-y divide-white/10">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pb-3 pt-4">
        <p className="label">{display.title}</p>
        <span className="text-xs text-slate-500">{rows.length} recorded</span>
      </div>
      {rows.map((activity) => {
        const calories = formatNumber(activity.calories, 0);
        const steps = formatNumber(activity.steps, 0);
        const avgHr = formatNumber(activity.avgHr, 0);
        const minHr = formatNumber(activity.minHr, 0);
        const maxHr = formatNumber(activity.maxHr, 0);
        return (
          <div key={`${activity.kind}|${activity.startedAt}`} className="px-4 py-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-slate-200">
                <span className="mr-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-300">{display.badge}</span>
                <strong>{activity.sportName || `Sport ${activity.sportType}`}</strong>
                <span className="ml-2 text-slate-500">
                  {formatIstInstant(activity.startedAt, 'time')} to {formatIstInstant(activity.endedAt, 'time')}
                </span>
              </span>
              <span className="text-slate-400">{formatMinutes(Math.round(activity.durationSec / 60))}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Calories {calories === null ? 'not recorded' : `${calories} kcal`}
              {' · '}Steps {steps === null ? 'not recorded' : steps}
              {' · '}HR avg {avgHr === null ? 'n/a' : `${avgHr} bpm`}
              {' · '}min {minHr === null ? 'n/a' : `${minHr} bpm`}
              {' · '}max {maxHr === null ? 'n/a' : `${maxHr} bpm`}
              {' · '}Detail {activity.hasDetail ? 'available' : 'summary only'}
            </p>
          </div>
        );
      })}
      <p className="px-4 py-3 text-xs leading-5 text-slate-500">{display.note}</p>
    </section>
  );
}
