import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { ActivityView } from '../components/dashboard/ActivityView';
import { OverviewView } from '../components/dashboard/OverviewView';
import { SleepView } from '../components/dashboard/SleepView';
import { VitalsView } from '../components/dashboard/VitalsView';
import type {
  Coverage,
  Activity,
  DayMetric,
  ReadinessComponent,
  ReadinessComponents,
  SeriesSample,
  SleepDay,
  SleepSession,
} from '../lib/api/types';
import {
  collectDayKeys,
  dailySeriesMeans,
  knownStepTotal,
  resolveSelection,
  splitActivities,
} from '../lib/dashboard';
import { enumerateDayKeys } from '../lib/dates';

/** Server markup with tags and React text separators removed. */
function visibleText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderText(element: ReactElement): string {
  return visibleText(renderToStaticMarkup(element));
}

function dayMetric(overrides: Partial<DayMetric> & { dayKey: string }): DayMetric {
  return {
    steps: null,
    avgHr: null,
    restingHr: null,
    hrvRmssd: null,
    respRate: null,
    spo2Avg: null,
    spo2Min: null,
    spo2SleepAvg: null,
    spo2SleepMin: null,
    spo2Samples: 0,
    stressAvg: null,
    skinTempNightC: null,
    skinTempDeviationC: null,
    sleepScore: null,
    sleepMins: null,
    sleepDeepMins: null,
    sleepRemMins: null,
    sleepLightMins: null,
    sleepWakeMins: null,
    timeInBedMins: null,
    sleepEfficiencyPct: null,
    napCount: 0,
    workoutCount: 0,
    autoActivityCount: 0,
    workoutCalories: null,
    trainingLoad: null,
    paiScore: null,
    readiness: null,
    readinessStatus: null,
    readinessBand: null,
    readinessComponents: null,
    updatedAt: '2026-10-19T00:00:00Z',
    ...overrides,
  };
}

function sleepSession(overrides: Partial<SleepSession> = {}): SleepSession {
  return {
    startedAt: '2026-10-17T18:40:00Z',
    endedAt: '2026-10-18T01:40:00Z',
    score: 76,
    totalMins: 420,
    deepMins: 90,
    remMins: 110,
    lightMins: 220,
    wakeMins: 0,
    stagesTruncated: false,
    stages: [
      { start: '2026-10-17T18:40:00Z', end: '2026-10-17T20:10:00Z', type: 5 },
      { start: '2026-10-17T20:10:00Z', end: '2026-10-17T22:10:00Z', type: 4 },
      { start: '2026-10-17T22:10:00Z', end: '2026-10-17T23:10:00Z', type: 8 },
    ],
    ...overrides,
  };
}

function activity(overrides: Partial<Activity> & { dayKey: string; kind: Activity['kind'] }): Activity {
  return {
    startedAt: '2026-10-18T00:00:00Z',
    endedAt: '2026-10-18T01:00:00Z',
    durationSec: 3600,
    sportType: 1,
    sportName: 'Run',
    calories: null,
    avgHr: null,
    maxHr: null,
    minHr: null,
    steps: null,
    hasDetail: false,
    ...overrides,
  };
}

describe('sleep main and naps', () => {
  it('renders the main session and its nap separately', () => {
    const sleepDay: SleepDay = {
      dayKey: '2026-10-18',
      main: sleepSession(),
      naps: [
        sleepSession({
          startedAt: '2026-10-18T10:00:00Z',
          endedAt: '2026-10-18T10:45:00Z',
          score: null,
          totalMins: 45,
          deepMins: 5,
          remMins: 10,
          lightMins: 30,
          stages: [],
        }),
      ],
    };

    const text = renderText(
      <SleepView dayKey="2026-10-18" sleepDay={sleepDay} day={dayMetric({ dayKey: '2026-10-18' })} trend={[]} />,
    );

    expect(text).toContain('Main sleep score 76');
    expect(text).toContain('Main sleep time asleep 7h 0m');
    expect(text).toContain('Naps');
    expect(text).toContain('45m asleep');
  });

  it('keeps a nap visible when no main session exists', () => {
    const sleepDay: SleepDay = {
      dayKey: '2026-10-18',
      main: null,
      naps: [
        sleepSession({
          startedAt: '2026-10-18T10:00:00Z',
          endedAt: '2026-10-18T11:00:00Z',
          score: null,
          totalMins: 60,
          stages: [],
        }),
      ],
    };

    const text = renderText(
      <SleepView dayKey="2026-10-18" sleepDay={sleepDay} day={dayMetric({ dayKey: '2026-10-18' })} trend={[]} />,
    );

    expect(text).toContain('No main sleep recorded');
    expect(text).toContain('1h 0m asleep');
    expect(text).not.toContain('Main sleep score');
  });

  it('labels the daily non-nap total apart from the main session', () => {
    const sleepDay: SleepDay = {
      dayKey: '2026-10-18',
      main: sleepSession({ totalMins: 300, deepMins: 60, remMins: 80, lightMins: 160 }),
      naps: [],
    };
    const day = dayMetric({
      dayKey: '2026-10-18',
      sleepMins: 480,
      sleepDeepMins: 120,
      sleepRemMins: 100,
      sleepLightMins: 260,
      sleepWakeMins: 20,
    });

    const text = renderText(
      <SleepView dayKey="2026-10-18" sleepDay={sleepDay} day={day} trend={[day]} />,
    );

    expect(text).toContain('Daily non-nap total');
    expect(text).toContain('8h 0m');
    expect(text).toContain('Main sleep time asleep 5h 0m');
  });

  it('shows the final stage end in IST, zero wake minutes and a truncation warning', () => {
    const sleepDay: SleepDay = {
      dayKey: '2026-10-19',
      main: sleepSession({
        startedAt: '2026-10-18T18:30:00Z',
        endedAt: '2026-10-19T00:31:00Z',
        wakeMins: 0,
        stagesTruncated: true,
        stages: [
          { start: '2026-10-18T18:30:00Z', end: '2026-10-18T19:30:00Z', type: 5 },
          { start: '2026-10-18T20:30:00Z', end: '2026-10-19T00:31:00Z', type: 4 },
        ],
      }),
      naps: [],
    };

    const text = renderText(
      <SleepView dayKey="2026-10-19" sleepDay={sleepDay} day={dayMetric({ dayKey: '2026-10-19' })} trend={[]} />,
    );

    expect(text).toContain('Ended 06:01 IST');
    expect(text).toContain('Wake 0m');
    expect(text).toContain('Incomplete stage timeline');
  });
});

describe('day selection', () => {
  const days = [
    dayMetric({ dayKey: '2026-10-01', readiness: 40 }),
    dayMetric({ dayKey: '2026-10-19', readiness: 72 }),
  ];
  const activities = [activity({ dayKey: '2026-10-10', kind: 'auto' })];

  it('selects from the union of daily rows, sleep days and activities', () => {
    const keys = collectDayKeys(days, [], activities);
    expect(keys).toEqual(['2026-10-01', '2026-10-10', '2026-10-19']);
  });

  it('moves the selection into the new range and keeps activity-only days', () => {
    // A 30-day snapshot so the 7-day window really excludes the early keys.
    const monthKeys = enumerateDayKeys('2026-09-20', '2026-10-19');
    const activityOnly = '2026-10-15';
    const monthDays = monthKeys
      .filter((key) => key !== activityOnly)
      .map((key) => dayMetric({ dayKey: key }));
    const monthActivities = [activity({ dayKey: activityOnly, kind: 'auto' })];

    const allKeys = collectDayKeys(monthDays, [], monthActivities);
    expect(allKeys).toHaveLength(30);

    const visible = allKeys.slice(-7);
    expect(visible).not.toContain('2026-09-20');
    expect(visible).toContain(activityOnly);
    expect(visible).toHaveLength(7);

    // Shrinking 30 to 7 days visibly moves the selection to the latest key.
    expect(resolveSelection(visible, '2026-09-20')).toBe('2026-10-19');
    expect(resolveSelection(visible, null)).toBe('2026-10-19');
    expect(resolveSelection(visible, activityOnly)).toBe(activityOnly);
  });

  it('never substitutes another day for an activity-only date', () => {
    const text = renderText(
      <OverviewView dayKey="2026-10-10" day={undefined} days={days} series={[]} isToday={false} />,
    );
    expect(text).toContain('No daily record for this day');
    expect(text).toContain('Readiness unavailable for this day');
    expect(text).not.toContain('Readiness 72');
    expect(text).not.toContain('Scored');
  });
});

describe('activities', () => {
  const shared = {
    dayKey: '2026-10-18',
    startedAt: '2026-10-18T00:00:00Z',
    endedAt: '2026-10-18T01:00:00Z',
  };
  const workout = activity({
    ...shared,
    kind: 'workout',
    sportName: 'Run',
    calories: 500,
    avgHr: 140,
    maxHr: 170,
    minHr: 90,
    steps: 0,
    hasDetail: true,
  });
  const auto = activity({
    ...shared,
    kind: 'auto',
    sportName: 'Walk',
    durationSec: 900,
    sportType: 0,
    steps: 120,
    hasDetail: false,
  });

  it('keeps both kinds that share a start instant', () => {
    const split = splitActivities([workout, auto]);
    expect(split.workouts.map((item) => item.kind)).toEqual(['workout']);
    expect(split.auto.map((item) => item.kind)).toEqual(['auto']);
    expect([...split.workouts, ...split.auto]).toHaveLength(2);
  });

  it('shows zero calories or steps as zero and null as not recorded', () => {
    const text = renderText(
      <ActivityView
        dayKey="2026-10-18"
        days={[dayMetric({ dayKey: '2026-10-18', steps: 0 })]}
        activities={[workout, auto]}
      />,
    );

    expect(text).toContain('Recorded workout');
    expect(text).toContain('Automatically detected movement');
    expect(text).toContain('Calories 500 kcal');
    expect(text).toContain('Steps 0');
    expect(text).toContain('Calories not recorded');
    expect(text).toContain('Detail available');
    expect(text).toContain('Detail summary only');
    expect(text).not.toContain('NaN');
  });
});

describe('persisted readiness', () => {
  const hrvComponent: ReadinessComponent = {
    name: 'hrv',
    value: 48.2,
    x: null,
    center: 52.1,
    sd: 6.4,
    sdPersonal: null,
    n: 5,
    z: -0.61,
    sub: 61.5,
    weight: 0.25,
    points: 20.5,
    nights: 5,
    chronic: null,
    ratio: null,
    dev: null,
  };
  const components: ReadinessComponents = {
    status: 'calibrating',
    score: null,
    raw: null,
    baselineNights: 5,
    components: [hrvComponent],
    flags: ['baseline_stale:hrv'],
  };

  it('renders the stored score, status and components', () => {
    const day = dayMetric({
      dayKey: '2026-10-18',
      readiness: 72,
      readinessStatus: 'calibrating',
      readinessBand: 'good',
      readinessComponents: components,
    });

    const text = renderText(
      <OverviewView dayKey="2026-10-18" day={day} days={[day]} series={[]} isToday />,
    );

    expect(text).toContain('Calibrating');
    expect(text).toContain('72');
    expect(text).toContain('5 baseline nights');
    expect(text).not.toMatch(/algorithm v/i);
    expect(text).toContain('HRV (RMSSD)');
    expect(text).toContain('48.2 ms');
    expect(text).toContain('Sub 61.5');
    expect(text).toContain('weight 0.25');
    expect(text).toContain('points 20.5');
    expect(text).toContain('Stale baseline for HRV (RMSSD)');
    expect(text).toContain('research-informed product score');
    expect(text).not.toMatch(/capacity|injury|illness|harder/i);
  });

  it('separates no_baseline from no_data and never shows a false zero', () => {
    const noBaseline = dayMetric({
      dayKey: '2026-10-17',
      readinessComponents: { ...components, status: 'no_baseline', baselineNights: 2, components: [] },
    });
    const noData = dayMetric({
      dayKey: '2026-10-16',
      readinessComponents: { ...components, status: 'no_data', baselineNights: 0, components: [] },
    });

    const baselineText = renderText(
      <OverviewView dayKey="2026-10-17" day={noBaseline} days={[noBaseline]} series={[]} isToday={false} />,
    );
    const dataText = renderText(
      <OverviewView dayKey="2026-10-16" day={noData} days={[noData]} series={[]} isToday={false} />,
    );

    expect(baselineText).toContain('Not enough recent baseline nights');
    expect(dataText).toContain('Insufficient nightly HRV for this date');
    expect(baselineText).not.toContain('Readiness 0');
    expect(dataText).not.toContain('Readiness 0');
  });

  it('shows the stored readiness band as text and in the ring name', () => {
    const day = dayMetric({
      dayKey: '2026-10-19',
      readiness: 55,
      readinessStatus: 'scored',
      readinessBand: 'fair',
      readinessComponents: { ...components, status: 'scored', score: 55, baselineNights: 19 },
    });

    const markup = renderToStaticMarkup(
      <OverviewView dayKey="2026-10-19" day={day} days={[day]} series={[]} isToday />,
    );
    const text = visibleText(markup);

    expect(text).toContain('Fair');
    expect(text).toContain('Scored 55 of 100, band Fair');
    expect(markup).toContain('aria-label="Readiness 55, band Fair"');
  });

  it('adds no band text when the stored band is null', () => {
    const day = dayMetric({
      dayKey: '2026-10-18',
      readiness: null,
      readinessStatus: 'calibrating',
      readinessBand: null,
      readinessComponents: components,
    });

    const markup = renderToStaticMarkup(
      <OverviewView dayKey="2026-10-18" day={day} days={[day]} series={[]} isToday={false} />,
    );
    const text = visibleText(markup);

    expect(markup).toContain('aria-label="Readiness not available"');
    expect(markup).not.toContain(', band ');
    expect(text).toContain('Not available');
    expect(text).not.toMatch(/\b(Good|Fair|Low)\b/);
  });
});

describe('units and missing values', () => {
  it('names PAI, TRIMP and workout calories without strain wording', () => {
    const day = dayMetric({
      dayKey: '2026-10-18',
      paiScore: 150,
      trainingLoad: 42.6,
      workoutCalories: 500,
      skinTempNightC: 33.27,
      skinTempDeviationC: -0.18,
    });

    const overview = renderText(
      <OverviewView dayKey="2026-10-18" day={day} days={[day]} series={[]} isToday />,
    );
    const vitals = renderText(
      <VitalsView dayKey="2026-10-18" day={day} dayHr={[]} series={[]} temperature={[]} />,
    );

    expect(overview).toContain('PAI 150 pts');
    expect(overview).toContain('Training load 42.6 TRIMP');
    expect(overview).toContain('Workout calories 500 kcal');
    expect(overview).not.toMatch(/strain/i);
    expect(overview).not.toMatch(/total burn|core temperature/i);
    expect(vitals).toContain('Nightly skin temperature 33.27 °C');
    expect(vitals).toContain('Skin temperature deviation -0.18 °C');
  });

  it('never turns unknown SpO2 into 100 and keeps a real 100', () => {
    const empty = renderText(
      <VitalsView
        dayKey="2026-10-18"
        day={dayMetric({ dayKey: '2026-10-18' })}
        dayHr={[]}
        series={[]}
        temperature={[]}
      />,
    );
    const insufficient = renderText(
      <VitalsView
        dayKey="2026-10-18"
        day={dayMetric({ dayKey: '2026-10-18', spo2Samples: 1 })}
        dayHr={[]}
        series={[]}
        temperature={[]}
      />,
    );
    const measured = renderText(
      <VitalsView
        dayKey="2026-10-18"
        day={dayMetric({ dayKey: '2026-10-18', spo2Avg: 97.3, spo2Min: 95, spo2Samples: 3 })}
        dayHr={[]}
        series={[]}
        temperature={[]}
      />,
    );
    const perfect = renderText(
      <VitalsView
        dayKey="2026-10-18"
        day={dayMetric({ dayKey: '2026-10-18', spo2Avg: 100, spo2Min: 100, spo2Samples: 4 })}
        dayHr={[]}
        series={[]}
        temperature={[]}
      />,
    );

    expect(empty).toContain('No SpO');
    expect(empty).not.toContain('100%');
    expect(insufficient).toContain('Insufficient');
    expect(insufficient).toContain('1 valid sample, 3 needed for a daily average');
    expect(measured).toContain('97.3%');
    expect(measured).toContain('min 95%');
    expect(perfect).toContain('100%');
  });

  it('means multiple readings per full day key and keeps gaps as gaps', () => {
    const samples: SeriesSample[] = [
      { metric: 'stress', dayKey: '2025-10-18', sampledAt: '2025-10-18T02:00:00Z', value: 20 },
      { metric: 'stress', dayKey: '2026-10-17', sampledAt: '2026-10-17T02:00:00Z', value: 20 },
      { metric: 'stress', dayKey: '2026-10-19', sampledAt: '2026-10-19T02:00:00Z', value: 60 },
      { metric: 'stress', dayKey: '2026-10-19', sampledAt: '2026-10-19T03:00:00Z', value: 20 },
      { metric: 'stress', dayKey: '2026-10-19', sampledAt: '2026-10-19T04:00:00Z', value: 40 },
    ];

    const stressMeans = dailySeriesMeans(samples).filter((mean) => mean.metric === 'stress');
    expect(stressMeans.map((mean) => [mean.dayKey, mean.value])).toEqual([
      ['2025-10-18', 20],
      ['2026-10-17', 20],
      ['2026-10-19', 40],
    ]);

    const byDay = new Map<string, number>(
      stressMeans.map((mean) => [mean.dayKey, mean.value] as const),
    );
    const gapRows = enumerateDayKeys('2026-10-17', '2026-10-19').map((dayKey) => byDay.get(dayKey) ?? null);
    expect(gapRows).toEqual([20, null, 40]);
  });

  it('drops SpO2 daily means below three samples', () => {
    const samples: SeriesSample[] = [
      { metric: 'spo2', dayKey: '2026-10-18', sampledAt: '2026-10-18T02:00:00Z', value: 96 },
      { metric: 'spo2', dayKey: '2026-10-18', sampledAt: '2026-10-18T03:00:00Z', value: 98 },
      { metric: 'spo2', dayKey: '2026-10-19', sampledAt: '2026-10-19T02:00:00Z', value: 97 },
      { metric: 'spo2', dayKey: '2026-10-19', sampledAt: '2026-10-19T03:00:00Z', value: 97 },
      { metric: 'spo2', dayKey: '2026-10-19', sampledAt: '2026-10-19T04:00:00Z', value: 97 },
    ];

    expect(dailySeriesMeans(samples, 3).map((mean) => mean.dayKey)).toEqual(['2026-10-19']);
  });

  it('treats null steps as unknown and zero steps as known', () => {
    expect(knownStepTotal([dayMetric({ dayKey: '2026-10-18' })])).toEqual({
      total: 0,
      knownDays: 0,
      partial: true,
    });
    expect(
      knownStepTotal([
        dayMetric({ dayKey: '2026-10-18', steps: 0 }),
        dayMetric({ dayKey: '2026-10-19', steps: 100 }),
        dayMetric({ dayKey: '2026-10-20' }),
      ]),
    ).toEqual({ total: 100, knownDays: 2, partial: true });

    const text = renderText(
      <OverviewView
        dayKey="2026-10-18"
        day={dayMetric({ dayKey: '2026-10-18' })}
        days={[dayMetric({ dayKey: '2026-10-18' })]}
        series={[]}
        isToday
      />,
    );
    expect(text).toContain('Total steps (partial)');
    expect(text).toContain('No step data');
    expect(text).not.toContain('NaN');
  });
});

const EMPTY_COVERAGE_TYPES: Coverage['types'] = {
  '0x01': null,
  '0x05': null,
  '0x06': null,
  '0x0D': null,
  '0x13': null,
  '0x25': null,
  '0x2E': null,
  '0x38': null,
  '0x46': null,
  '0x48': null,
  '0x49': null,
};

describe('sync status coverage', () => {
  it('keeps the waiting state and missing-value labels when no streams have data', () => {
    const text = renderText(
      <SyncStatusBar
        coverage={{
          hasData: false,
          lastIngestAt: null,
          dataThrough: null,
          types: EMPTY_COVERAGE_TYPES,
        }}
      />,
    );

    expect(text).toContain('Waiting for strap data');
    expect(text).toContain('Last ingest never');
    expect(text).not.toContain('data streams');
    expect(text).not.toContain('Data through');
  });

  it('counts only coverage types with a non-null watermark', () => {
    const text = renderText(
      <SyncStatusBar
        coverage={{
          hasData: true,
          lastIngestAt: '2026-10-19T00:00:00Z',
          dataThrough: '2026-10-19T00:00:00Z',
          types: {
            ...EMPTY_COVERAGE_TYPES,
            '0x01': '2026-10-18T00:00:00Z',
          },
        }}
      />,
    );

    expect(text).toContain('Data available');
    expect(text).toMatch(/(?:^|\s)1 data streams(?:\s|$)/);
  });
});
