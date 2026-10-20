'use client';

import Link from 'next/link';
import { useState } from 'react';
import type {
  Activity,
  DayMetric,
  HeartRateSample,
  SeriesSample,
  SleepDay,
  TemperatureSample,
} from '@/lib/api/types';
import { BrandMark } from '@/components/BrandMark';
import { SignOutButton } from '@/components/SignOutButton';
import {
  collectDayKeys,
  DASHBOARD_RANGES,
  resolveSelection,
  type DashboardRange,
} from '@/lib/dashboard';
import { formatDayKey, istDayKey } from '@/lib/dates';
import { OverviewView } from './OverviewView';
import { SleepView } from './SleepView';
import { ActivityView } from './ActivityView';
import { VitalsView } from './VitalsView';

export type DashboardData = {
  days: DayMetric[];
  sleep: SleepDay[];
  activities: Activity[];
  temperature: TemperatureSample[];
  series: SeriesSample[];
  heartRate: HeartRateSample[];
};

const TABS = ['overview', 'sleep', 'activity', 'vitals'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  sleep: 'Sleep',
  activity: 'Activity',
  vitals: 'Vitals',
};

export function DashboardApp({
  days,
  sleep,
  activities,
  temperature,
  series,
  heartRate,
}: DashboardData) {
  const [tab, setTab] = useState<Tab>('overview');
  const [range, setRange] = useState<DashboardRange>(30);
  const [requestedDay, setRequestedDay] = useState<string | null>(null);

  // Selectable days come from daily rows, sleep days and activities together, so
  // a nap-only or activity-only date stays reachable.
  const visibleKeys = collectDayKeys(days, sleep, activities).slice(-range);
  const selectedKey = resolveSelection(visibleKeys, requestedDay);
  const firstKey = visibleKeys.length > 0 ? visibleKeys[0] : '';
  const inRange = (key: string) => key >= firstKey;

  const visibleDays = days.filter((item) => inRange(item.dayKey));
  const visibleActivities = activities.filter((item) => inRange(item.dayKey));
  const visibleSeries = series.filter((item) => inRange(item.dayKey));
  const visibleTemperature = temperature.filter((item) => inRange(item.dayKey));

  const day = days.find((item) => item.dayKey === selectedKey);
  const sleepDay = sleep.find((item) => item.dayKey === selectedKey);
  const dayHr = heartRate.filter((item) => item.dayKey === selectedKey);
  const isToday = selectedKey !== null && selectedKey === istDayKey();

  return (
    <div className="fade-up">
      <header className="mb-6 flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" aria-label="Heliolytics dashboard" className="rounded-lg"><BrandMark /></Link>
        <div className="flex items-center gap-2 lg:justify-end"><span className="hidden text-xs text-slate-500 sm:block">Private health console</span><SignOutButton /></div>
      </header>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="eyebrow mb-2">Your health, clearly</p>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">The daily picture</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">One calm view of recovery, sleep, movement, and the signals behind them.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-2xl border border-white/10 bg-black/10 p-1">
            {TABS.map((item) => (
              <button key={item} type="button" onClick={() => setTab(item)} aria-pressed={tab === item} className="surface-button border-transparent px-3 py-2 text-xs sm:text-sm">
                {TAB_LABELS[item]}
              </button>
            ))}
          </div>
          <div className="flex gap-1 rounded-2xl border border-white/10 bg-black/10 p-1">
            {DASHBOARD_RANGES.map((count) => (
              <button key={count} type="button" onClick={() => setRange(count)} aria-pressed={range === count} className="surface-button border-transparent px-2.5 py-2 text-xs">
                {count}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-300" /> Showing <strong className="text-white">{range} days</strong> of your trends</div>
        {visibleKeys.length > 0 ? (
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Day
            <select value={selectedKey ?? ''} onChange={(event) => setRequestedDay(event.target.value)} className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm font-medium normal-case tracking-normal text-white outline-none focus:ring-2 focus:ring-emerald-300/60">
              {visibleKeys.map((key) => <option key={key} value={key}>{formatDayKey(key)}</option>)}
            </select>
          </label>
        ) : null}
      </div>

      {tab === 'overview' ? <OverviewView dayKey={selectedKey} day={day} days={visibleDays} series={visibleSeries} isToday={isToday} /> : null}
      {tab === 'sleep' ? <SleepView dayKey={selectedKey} sleepDay={sleepDay} day={day} trend={visibleDays} /> : null}
      {tab === 'activity' ? <ActivityView dayKey={selectedKey} days={visibleDays} activities={visibleActivities} /> : null}
      {tab === 'vitals' ? <VitalsView dayKey={selectedKey} day={day} dayHr={dayHr} series={visibleSeries} temperature={visibleTemperature} /> : null}
    </div>
  );
}
