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
import type { HeartRateSample } from '@/lib/api/types';
import { formatDayKey, formatIstInstant } from '@/lib/dates';

/** Continuous heart rate for the selected IST day from measured 0x01 samples. */
export function HeartRateChart({
  dayKey,
  samples,
}: {
  dayKey: string | null;
  samples: HeartRateSample[];
}) {
  const data = [...samples]
    .sort((a, b) => a.sampledAt.localeCompare(b.sampledAt))
    .map((sample) => ({
      time: formatIstInstant(sample.sampledAt, 'time'),
      bpm: sample.bpm,
    }));

  if (!data.length) {
    return <div className="card p-8 text-center text-sm text-slate-500">No continuous HR data</div>;
  }

  return (
    <div className="card overflow-x-hidden p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-200">Heart rate</h3>
        <span className="text-xs text-slate-500">
          {dayKey === null ? 'IST' : `${formatDayKey(dayKey, 'long')} IST`}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff453a" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#ff453a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={48} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" bpm" width={52} domain={[40, 'dataMax + 10']} />
          <Tooltip contentStyle={{ background: '#141414', border: '1px solid #ffffff1a', borderRadius: 8 }} />
          <Area type="monotone" dataKey="bpm" stroke="#ff453a" strokeWidth={2} fill="url(#hrFill)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
