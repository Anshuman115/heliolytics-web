import type { ComponentName, DayMetric } from '@/lib/api/types';
import { formatNumber } from '@/lib/dashboard';

const LIMITATION =
  'Heliolytics readiness v1 is a research-informed product score. Its weights are versioned product choices, not a validated medical formula or a universal industry standard, and it is not a Zepp or WHOOP equivalent.';

const COMPONENT_DISPLAY: Record<ComponentName, { label: string; unit: string }> = {
  hrv: { label: 'HRV (RMSSD)', unit: 'ms' },
  hrv_balance: { label: 'HRV balance (log mean)', unit: 'log(ms)' },
  sleeping_hr: { label: 'Sleeping heart rate', unit: 'bpm' },
  sleep: { label: 'Sleep', unit: 'min' },
  skin_temp: { label: 'Skin temperature', unit: '°C' },
  resp_rate: { label: 'Respiration rate', unit: 'breaths/min' },
  load: { label: 'Training load', unit: 'TRIMP' },
};

function isComponentName(name: string): name is ComponentName {
  return Object.prototype.hasOwnProperty.call(COMPONENT_DISPLAY, name);
}

function describeFlag(flag: string): string {
  const separator = flag.indexOf(':');
  if (separator === -1) return flag;
  const kind = flag.slice(0, separator);
  const target = flag.slice(separator + 1);
  const label = isComponentName(target) ? COMPONENT_DISPLAY[target].label : target;
  if (kind === 'missing') return `Missing ${label}`;
  if (kind === 'baseline_stale') return `Stale baseline for ${label}`;
  return flag;
}

/**
 * Persisted readiness explanation. Every number here comes from the stored
 * components; the browser never recomputes a score, weight or baseline.
 */
export function ReadinessDetails({ day }: { day?: DayMetric }) {
  const components = day?.readinessComponents ?? null;

  if (!components) {
    return (
      <section className="card mb-6 p-5 sm:p-6">
        <p className="eyebrow mb-1">Readiness detail</p>
        <p className="text-sm text-slate-300">Readiness unavailable for this day. No stored score or components exist for the date.</p>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">{LIMITATION}</p>
      </section>
    );
  }

  const statusText =
    components.status === 'scored'
      ? `Scored ${formatNumber(components.score, 0) ?? 'n/a'} of 100`
      : components.status === 'calibrating'
        ? `Calibrating with ${components.baselineNights} baseline nights`
        : components.status === 'no_baseline'
          ? `Not enough recent baseline nights (${components.baselineNights} recorded)`
          : 'Insufficient nightly HRV for this date';

  return (
    <section className="card mb-6 p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="eyebrow mb-1">Readiness detail</p>
          <h3 className="text-lg font-bold text-white">{statusText}</h3>
        </div>
        <p className="text-xs text-slate-400">Algorithm v{components.version} · {components.baselineNights} baseline nights</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {components.components.map((component) => {
          const display = isComponentName(component.name)
            ? COMPONENT_DISPLAY[component.name]
            : { label: component.name, unit: '' };
          const value = formatNumber(component.value, 2);
          const sub = formatNumber(component.sub, 1);
          const weight = formatNumber(component.weight, 2);
          const points = formatNumber(component.points, 2);
          const z = formatNumber(component.z, 2);
          return (
            <div key={component.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="label">{display.label}</p>
              <p className="mt-1 font-semibold tabular-nums text-white">
                {value === null ? 'n/a' : `${value} ${display.unit}`.trim()}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Sub {sub ?? 'n/a'} · weight {weight ?? 'n/a'} · points {points ?? 'n/a'}
              </p>
              {z === null ? null : (
                <p className="mt-1 text-xs text-slate-500">
                  Baseline center {formatNumber(component.center, 2) ?? 'n/a'} · spread {formatNumber(component.sd, 2) ?? 'n/a'} · z {z}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {components.flags.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2 text-xs text-amber-200/90">
          {components.flags.map((flag) => (
            <li key={flag} className="rounded-full bg-amber-300/10 px-2.5 py-1">{describeFlag(flag)}</li>
          ))}
        </ul>
      ) : null}

      <p className="mt-4 max-w-3xl text-xs leading-5 text-slate-500">{LIMITATION}</p>
    </section>
  );
}
