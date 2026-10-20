'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Activity } from '@/lib/api/types';
import { formatDayKey } from '@/lib/dates';

/** Recorded workout minutes per day. Automatic movement is excluded. */
export function WorkoutsChart({ workouts }: { workouts: Activity[] }) {
  const byDay = new Map<string, number>();
  for (const workout of workouts) {
    byDay.set(workout.dayKey, (byDay.get(workout.dayKey) ?? 0) + Math.round(workout.durationSec / 60));
  }
  const data = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, mins]) => ({ day: formatDayKey(dayKey), mins }));

  if (!data.length) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        No recorded workout data
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-200">Workout minutes</h3>
        <span className="text-xs text-slate-500">Recorded workouts only</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <defs>
            <linearGradient id="workoutsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#30d158" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#0f9d58" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={24} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" min" width={44} />
          <Tooltip
            cursor={{ fill: '#ffffff08' }}
            contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}
          />
          <Bar dataKey="mins" fill="url(#workoutsFill)" name="Minutes" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
