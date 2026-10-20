/**
 * Indian Standard Time helpers. All dashboard dates are IST civil dates, so
 * nothing here reads the browser or process timezone. The module is pure and
 * never imports API transport or environment.
 */

const IST_TIME_ZONE = 'Asia/Kolkata';

export type IstRange = { from: string; to: string };

const dayKeyParts = new Intl.DateTimeFormat('en-US', {
  timeZone: IST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const istTimeParts = new Intl.DateTimeFormat('en-US', {
  timeZone: IST_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const istDateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST_TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
});

const shortDayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const longDayFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((item) => item.type === type)?.value ?? '';
}

/** Today's IST civil date key, for example `2026-10-19`. */
export function istDayKey(now: Date = new Date()): string {
  if (!Number.isFinite(now.getTime())) return '';
  const parts = dayKeyParts.formatToParts(now);
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`;
}

/**
 * Inclusive IST window of `count` days ending today: a 30-day window starts
 * today minus 29, computed with UTC date arithmetic on the civil key only.
 */
export function istRange(count: number, now: Date = new Date()): IstRange {
  const to = istDayKey(now);
  if (!to || count < 1) return { from: to, to };
  const [year, month, day] = to.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day - (count - 1)));
  return { from: start.toISOString().slice(0, 10), to };
}

/**
 * Format an instant in IST. `time` gives `06:01 IST`; `datetime` adds the date
 * because a sample span can cross midnight.
 */
export function formatIstInstant(iso: string, style: 'time' | 'datetime'): string {
  const at = new Date(iso);
  if (!Number.isFinite(at.getTime())) return 'n/a';
  if (style === 'datetime') return `${istDateTimeFormat.format(at)} IST`;
  const parts = istTimeParts.formatToParts(at);
  return `${part(parts, 'hour')}:${part(parts, 'minute')} IST`;
}

/** Format an IST civil date key without shifting it through a local timezone. */
export function formatDayKey(dayKey: string, style: 'short' | 'long' = 'short'): string {
  const date = new Date(`${dayKey}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return 'n/a';
  return (style === 'long' ? longDayFormat : shortDayFormat).format(date);
}

/**
 * Inclusive ascending list of IST civil date keys, so a chart can show a
 * missing day as a gap instead of joining its neighbours.
 */
export function enumerateDayKeys(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  const dayMs = 86_400_000;
  const keys: string[] = [];
  for (let at = start; at <= end && keys.length < 366; at += dayMs) {
    keys.push(new Date(at).toISOString().slice(0, 10));
  }
  return keys;
}
