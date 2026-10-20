'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SleepStage } from '@/lib/api/types';
import { formatIstInstant } from '@/lib/dates';

const LEVEL: Record<SleepStage['type'], number> = { 7: 3, 8: 2, 4: 1, 5: 0 };
const LABELS = ['Deep', 'Light', 'REM', 'Awake'];

type Point = { at: number; level: number | null };

/**
 * Stored stages only. Spans are end-exclusive, the final end is shown, and a
 * gap between stored stages is a break rather than a guessed stage.
 */
export function HypnogramChart({ stages }: { stages: SleepStage[] }) {
  const sorted = [...stages].sort((a, b) => a.start.localeCompare(b.start));
  const points: Point[] = [];
  let previousEnd: number | null = null;

  for (const stage of sorted) {
    const start = new Date(stage.start).getTime();
    const end = new Date(stage.end).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    if (previousEnd !== null && start > previousEnd) points.push({ at: previousEnd, level: null });
    points.push({ at: start, level: LEVEL[stage.type] });
    points.push({ at: end, level: LEVEL[stage.type] });
    previousEnd = end;
  }

  if (points.length === 0) {
    return <div className="card p-8 text-center text-sm text-slate-500">No sleep stage timeline</div>;
  }

  return (
    <div className="card overflow-x-hidden p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-300">Sleep stages (hypnogram)</h3>
        <span className="text-xs text-slate-500">
          {formatIstInstant(sorted[0].start, 'time')} to {formatIstInstant(sorted[sorted.length - 1].end, 'time')}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={points} margin={{ left: 8, right: 8 }}>
          <defs>
            <linearGradient id="hypFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c8cff" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#7c8cff" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="at"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            minTickGap={40}
            tickFormatter={(value: number) => formatIstInstant(new Date(value).toISOString(), 'time')}
          />
          <YAxis
            type="number"
            domain={[0, 3]}
            ticks={[0, 1, 2, 3]}
            tickFormatter={(value: number) => LABELS[value] ?? ''}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            width={52}
          />
          <Tooltip
            contentStyle={{ background: '#141414', border: '1px solid #ffffff1a', borderRadius: 8 }}
            labelFormatter={(value) => formatIstInstant(new Date(Number(value)).toISOString(), 'time')}
            formatter={(value) => LABELS[Number(value)] ?? ''}
          />
          <Area type="stepAfter" dataKey="level" stroke="#8b9bff" strokeWidth={2} fill="url(#hypFill)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
