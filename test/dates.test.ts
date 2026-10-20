import { afterEach, describe, expect, it } from 'vitest';
import {
  enumerateDayKeys,
  formatDayKey,
  formatIstInstant,
  istDayKey,
  istRange,
} from '../lib/dates';

afterEach(() => {
  delete process.env.TZ;
});

describe('IST day keys', () => {
  it('moves to the next day at 18:30Z', () => {
    expect(istDayKey(new Date('2026-10-18T18:29:59Z'))).toBe('2026-10-18');
    expect(istDayKey(new Date('2026-10-18T18:30:00Z'))).toBe('2026-10-19');
  });

  it('builds an inclusive 30 day window and a 7 day window', () => {
    expect(istRange(30, new Date('2026-10-18T19:30:00Z'))).toEqual({ from: '2026-09-20', to: '2026-10-19' });
    expect(istRange(30, new Date('2026-10-18T23:59:00Z'))).toEqual({ from: '2026-09-20', to: '2026-10-19' });
    expect(istRange(7, new Date('2026-10-18T19:30:00Z'))).toEqual({ from: '2026-10-13', to: '2026-10-19' });
  });

  it('handles month, year and leap boundaries', () => {
    expect(istRange(30, new Date('2026-01-05T00:00:00Z'))).toEqual({ from: '2025-12-07', to: '2026-01-05' });
    expect(istRange(3, new Date('2028-03-01T00:00:00Z'))).toEqual({ from: '2028-02-28', to: '2028-03-01' });
  });

  it('ignores the process timezone', () => {
    const instants = [
      '2026-10-18T18:29:59Z',
      '2026-10-18T18:30:00Z',
      '2026-10-18T19:30:00Z',
      '2026-10-18T23:59:00Z',
    ];
    const outputs = ['UTC', 'America/Los_Angeles', 'Asia/Kolkata'].map((zone) => {
      process.env.TZ = zone;
      return instants.map((iso) => {
        const at = new Date(iso);
        return `${istDayKey(at)}|${istRange(30, at).from}|${istRange(7, at).from}`;
      });
    });

    expect(outputs[1]).toEqual(outputs[0]);
    expect(outputs[2]).toEqual(outputs[0]);
  });
});

describe('IST formatting', () => {
  it('formats instants in IST with an explicit label', () => {
    expect(formatIstInstant('2026-10-19T00:31:00Z', 'time')).toBe('06:01 IST');
    expect(formatIstInstant('2026-10-19T18:30:00Z', 'time')).toBe('00:00 IST');
    expect(formatIstInstant('not-a-date', 'time')).toBe('n/a');
  });

  it('formats civil day keys without a timezone shift', () => {
    process.env.TZ = 'America/Los_Angeles';
    expect(formatDayKey('2026-10-19')).toBe('Mon, Oct 19');
    expect(formatDayKey('2026-10-19', 'long')).toBe('Monday, October 19');
  });

  it('enumerates inclusive day keys so gaps stay gaps', () => {
    expect(enumerateDayKeys('2026-10-17', '2026-10-19')).toEqual([
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
    ]);
    expect(enumerateDayKeys('2026-10-19', '2026-10-17')).toEqual([]);
  });
});
