'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SeriesMetric, SeriesSample } from '@/lib/api/types';
import { dailySeriesMeans, type DailySeriesMean } from '@/lib/dashboard';
import { enumerateDayKeys, formatDayKey } from '@/lib/dates';

const METRIC_ORDER: SeriesMetric[] = ['hrv', 'stress', 'resp', 'spo2'];

const METRIC_DISPLAY: Record<
  SeriesMetric,
  { label: string; unit: string; color: string; minimumSamples: number; note: string }
> = {
  hrv: { label: 'HRV', unit: 'ms', color: '#a78bfa', minimumSamples: 1, note: 'Daily mean RMSSD' },
  stress: { label: 'Stress', unit: 'score', color: '#f97316', minimumSamples: 1, note: 'Daily mean stress score' },
  resp: { label: 'Respiration rate', unit: 'breaths/min', color: '#38bdf8', minimumSamples: 1, note: 'Daily mean breaths per minute' },
  spo2: { label: 'SpO\u2082', unit: '%', color: '#34d399', minimumSamples: 3, note: 'Daily mean, 3 samples minimum' },
};

/**
 * One small chart per metric so units are never mixed on one axis. Values are
 * daily means per full day key, decimals kept, and missing days stay gaps.
 */
export function VitalsSeriesChart({ samples }: { samples: SeriesSample[] }) {
  const means = dailySeriesMeans(samples);

  if (means.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        No vitals series data
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {METRIC_ORDER.map((metric) => (
        <MetricChart key={metric} metric={metric} means={means} />
      ))}
    </div>
  );
}

function MetricChart({ metric, means }: { metric: SeriesMetric; means: DailySeriesMean[] }) {
  const spec = METRIC_DISPLAY[metric];
  const rows = means.filter((row) => row.metric === metric && row.count >= spec.minimumSamples);

  if (rows.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-slate-500">
        No {spec.label} data
      </div>
    );
  }

  const byDay = new Map<string, number>(
    rows.map((row) => [row.dayKey, row.value] as const),
  );
  const data = enumerateDayKeys(rows[0].dayKey, rows[rows.length - 1].dayKey).map((dayKey) => {
    const value = byDay.get(dayKey);
    return { day: formatDayKey(dayKey), value: value === undefined ? null : value };
  });

  return (
    <div className="card overflow-x-hidden p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-200">{spec.label}</h3>
        <span className="text-xs text-slate-500">{spec.unit}</span>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10 }} minTickGap={24} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={40} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            name={`${spec.label} (${spec.unit})`}
            stroke={spec.color}
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-slate-500">{spec.note}. Missing days are not joined.</p>
    </div>
  );
}
