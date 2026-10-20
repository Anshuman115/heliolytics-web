import type { Activity, DayMetric } from '@/lib/api/types';
import { ActivitySessionsList } from '@/components/ActivitySessionsList';
import { StepsChart } from '@/components/charts/StepsChart';
import { WorkoutsChart } from '@/components/charts/WorkoutsChart';
import { splitActivities } from '@/lib/dashboard';
import { formatDayKey } from '@/lib/dates';

export function ActivityView({
  dayKey,
  days,
  activities,
}: {
  dayKey: string | null;
  days: DayMetric[];
  activities: Activity[];
}) {
  // One split of the single activities response. Nothing is deduplicated here.
  const { workouts, auto } = splitActivities(activities);

  return (
    <>
      <div className="mb-5">
        <p className="eyebrow mb-1">Movement</p>
        <h2 className="text-2xl font-black tracking-tight text-white">Activity with context</h2>
        <p className="mt-1 text-sm text-slate-400">
          {dayKey === null ? 'No day selected.' : `${formatDayKey(dayKey, 'long')} is the selected day; the charts cover the visible range.`}
        </p>
      </div>
      <div className="mb-6 grid gap-4 fade-up lg:grid-cols-2">
        <StepsChart days={days} />
        <WorkoutsChart workouts={workouts} />
      </div>

      <div className="fade-up">
        <ActivitySessionsList activities={workouts} kind="workout" />
        <ActivitySessionsList activities={auto} kind="auto" />
      </div>
    </>
  );
}
