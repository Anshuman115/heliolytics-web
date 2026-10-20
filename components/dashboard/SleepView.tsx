import type { DayMetric, SleepDay } from '@/lib/api/types';
import { HypnogramChart } from '@/components/charts/HypnogramChart';
import { SleepStagesChart } from '@/components/charts/SleepStagesChart';
import { StageBar } from '@/components/ui/StageBar';
import { Stat } from '@/components/ui/Stat';
import { formatMinutes } from '@/lib/dashboard';
import { formatDayKey, formatIstInstant } from '@/lib/dates';

/**
 * Selected-day sleep. The main session is `sleepDay.main`; naps are listed
 * separately and are never promoted, scored or merged into the main record.
 */
export function SleepView({
  dayKey,
  sleepDay,
  day,
  trend,
}: {
  dayKey: string | null;
  sleepDay?: SleepDay;
  day?: DayMetric;
  trend: DayMetric[];
}) {
  const main = sleepDay?.main ?? null;
  const naps = sleepDay?.naps ?? [];

  return (
    <>
      <div className="mb-5">
        <p className="eyebrow mb-1">Sleep</p>
        <h2 className="text-2xl font-black tracking-tight text-white">
          {dayKey === null ? 'No night selected' : formatDayKey(dayKey, 'long')}
        </h2>
      </div>

      {main === null ? (
        <div className="card mb-6 p-6 text-sm text-slate-300 fade-up">
          <p className="font-bold text-white">No main sleep recorded</p>
          <p className="mt-1 text-slate-400">
            {naps.length > 0
              ? 'Only naps were stored for this date. They are listed separately and are not scored.'
              : 'No sleep sessions were stored for this date.'}
          </p>
        </div>
      ) : (
        <div className="mb-6 space-y-4 fade-up">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Main sleep score" value={main.score === null ? 'n/a' : String(main.score)} accent="#7fa8c2" />
            <Stat label="Main sleep time asleep" value={formatMinutes(main.totalMins)} accent="#8d9fe8" />
            <Stat label="Main sleep deep + REM" value={formatMinutes(main.deepMins + main.remMins)} accent="#d56be9" />
          </div>

          <div className="card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="label">Main sleep session</p>
              <span className="text-xs text-slate-500">
                Started {formatIstInstant(main.startedAt, 'time')} · Ended {formatIstInstant(main.endedAt, 'time')}
              </span>
            </div>
            {main.stagesTruncated ? (
              <p className="mb-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
                Incomplete stage timeline. Stage totals below are the stored totals, but the timeline may not cover the whole session.
              </p>
            ) : null}
            <StageBar deep={main.deepMins} rem={main.remMins} light={main.lightMins} />
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
              <span><span className="text-indigo-400">●</span> Deep {formatMinutes(main.deepMins)}</span>
              <span><span className="text-violet-400">●</span> REM {formatMinutes(main.remMins)}</span>
              <span><span className="text-sky-400">●</span> Light {formatMinutes(main.lightMins)}</span>
              <span><span className="text-slate-300">●</span> Wake {formatMinutes(main.wakeMins)}</span>
            </div>
          </div>

          <HypnogramChart stages={main.stages} />
        </div>
      )}

      {naps.length > 0 ? (
        <section className="card mb-6 divide-y divide-white/10 fade-up">
          <div className="flex items-center justify-between px-4 pb-3 pt-4">
            <p className="label">Naps</p>
            <span className="text-xs text-slate-500">{naps.length} recorded</span>
          </div>
          {naps.map((nap) => (
            <div key={nap.startedAt} className="px-4 py-3 text-sm">
              <p className="text-slate-200">
                <strong>Nap</strong>
                <span className="ml-2 text-slate-500">
                  {formatIstInstant(nap.startedAt, 'time')} to {formatIstInstant(nap.endedAt, 'time')}
                </span>
              </p>
              <p className="mt-1 text-slate-400">
                {formatMinutes(nap.totalMins)} asleep · wake {formatMinutes(nap.wakeMins)} · deep {formatMinutes(nap.deepMins)} · REM {formatMinutes(nap.remMins)} · light {formatMinutes(nap.lightMins)}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {day && day.sleepMins !== null ? (
        <div className="card mb-6 p-4 fade-up">
          <p className="label">Daily non-nap total</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-white">{formatMinutes(day.sleepMins)}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Sum of every non-nap session stored for this date. A split night can be longer or shorter than the main session above.
          </p>
        </div>
      ) : null}

      <div className="fade-up">
        <SleepStagesChart days={trend} />
      </div>
    </>
  );
}
