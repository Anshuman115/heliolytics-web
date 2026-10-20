/**
 * Wire types for the Go API v1 (contract C3). Every field is required; a
 * missing measurement is `null`, never zero and never absent.
 */

export type ComponentName =
  | 'hrv'
  | 'hrv_balance'
  | 'sleeping_hr'
  | 'sleep'
  | 'skin_temp'
  | 'resp_rate'
  | 'load';

export type ReadinessStatus = 'scored' | 'calibrating' | 'no_baseline' | 'no_data';

export type ReadinessBand = 'good' | 'fair' | 'low';

/**
 * One stored readiness component (contract C4.4). Fields that do not apply to
 * a component name stay null on the wire; nothing is filled in by the client.
 */
export type ReadinessComponent = {
  name: ComponentName;
  value: number | null;
  x: number | null;
  center: number | null;
  sd: number | null;
  sdPersonal: number | null;
  n: number | null;
  z: number | null;
  sub: number | null;
  weight: number | null;
  points: number | null;
  nights: number | null;
  chronic: number | null;
  ratio: number | null;
  dev: number | null;
};

export type ReadinessComponents = {
  version: 1;
  status: ReadinessStatus;
  score: number | null;
  raw: number | null;
  baselineNights: number;
  components: ReadinessComponent[];
  flags: string[];
};

export type DayMetric = {
  dayKey: string;
  steps: number | null;
  avgHr: number | null;
  restingHr: number | null;
  hrvRmssd: number | null;
  respRate: number | null;
  spo2Avg: number | null;
  spo2Min: number | null;
  spo2SleepAvg: number | null;
  spo2SleepMin: number | null;
  spo2Samples: number;
  stressAvg: number | null;
  skinTempNightC: number | null;
  skinTempDeviationC: number | null;
  sleepScore: number | null;
  sleepMins: number | null;
  sleepDeepMins: number | null;
  sleepRemMins: number | null;
  sleepLightMins: number | null;
  sleepWakeMins: number | null;
  timeInBedMins: number | null;
  sleepEfficiencyPct: number | null;
  napCount: number;
  workoutCount: number;
  autoActivityCount: number;
  workoutCalories: number | null;
  trainingLoad: number | null;
  paiScore: number | null;
  readiness: number | null;
  readinessStatus: ReadinessStatus | null;
  readinessBand: ReadinessBand | null;
  readinessComponents: ReadinessComponents | null;
  updatedAt: string;
};

/** Stage codes: 5 deep, 4 light, 8 REM, 7 wake. Spans are end-exclusive. */
export type SleepStage = { start: string; end: string; type: 4 | 5 | 7 | 8 };

export type SleepSession = {
  startedAt: string;
  endedAt: string;
  score: number | null;
  totalMins: number;
  deepMins: number;
  remMins: number;
  lightMins: number;
  wakeMins: number;
  stagesTruncated: boolean;
  stages: SleepStage[];
};

export type SleepDay = {
  dayKey: string;
  main: SleepSession | null;
  naps: SleepSession[];
};

export type ActivityKind = 'workout' | 'auto';

export type Activity = {
  kind: ActivityKind;
  dayKey: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  sportType: number;
  sportName: string;
  calories: number | null;
  avgHr: number | null;
  maxHr: number | null;
  minHr: number | null;
  steps: number | null;
  hasDetail: boolean;
};

export type CompactDay = {
  dayKey: string;
  startTime: string;
  offsets: number[];
  values: number[];
};

export type SeriesMetric = 'hrv' | 'stress' | 'resp' | 'spo2';

export type SeriesDay = CompactDay & { metric: SeriesMetric };

export type Coverage = {
  hasData: boolean;
  lastIngestAt: string | null;
  dataThrough: string | null;
  types: Record<string, string | null>;
};

/** Expanded, client-side sample. Not a wire shape. */
export type HeartRateSample = {
  dayKey: string;
  sampledAt: string;
  bpm: number;
};

/** Expanded, client-side sample. Not a wire shape. */
export type TemperatureSample = {
  dayKey: string;
  sampledAt: string;
  celsius: number;
};

/** Expanded, client-side sample. Not a wire shape. */
export type SeriesSample = {
  metric: SeriesMetric;
  dayKey: string;
  sampledAt: string;
  value: number;
};
