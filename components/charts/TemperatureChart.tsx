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
import type { TemperatureSample } from '@/lib/api/types';
import { formatIstInstant } from '@/lib/dates';

/** On-wrist skin temperature samples. Not a nightly average or core temperature. */
export function TemperatureChart({ samples }: { samples: TemperatureSample[] }) {
  const data = [...samples]
    .sort((a, b) => a.sampledAt.localeCompare(b.sampledAt))
    .map((sample) => ({
      time: formatIstInstant(sample.sampledAt, 'time'),
      celsius: sample.celsius,
    }));

  if (!data.length) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        No on-wrist temperature samples
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-200">On-wrist skin temperature samples</h3>
        <span className="text-xs text-slate-500">IST</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#fb7185" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
          <XAxis
            dataKey="time"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" °C" width={52} />
          <Tooltip
            contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}
          />
          <Area type="monotone" dataKey="celsius" stroke="#fb7185" strokeWidth={2} fill="url(#tempFill)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
