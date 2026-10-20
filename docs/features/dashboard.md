# Dashboard

## One server fetch, then browser interaction

```text
app/page.tsx -> istRange(30) -> seven parallel signed API reads
  -> DashboardApp -> OverviewView / SleepView / ActivityView / VitalsView
```

`DashboardApp` manages the tab, selected day and 7/30-day range. These controls
filter data already received and never fetch again. `app/page.tsx` keeps one
`Promise.all` with an individual `catch` per request, so an HR failure does not
erase sleep, and renders the available results with a partial warning.

## Actual data reads

| Client function | Backend path | Collection |
|---|---|---|
| `fetchDays` | `/api/daily-metrics` | `days` |
| `fetchSleep` | `/api/sleep` | `days` |
| `fetchActivities` | `/api/activities` | `activities` |
| `fetchTemperature` | `/api/metrics/temperature` | `days` |
| `fetchSeries` | `/api/metrics/series` | `days` |
| `fetchHeartRate` | `/api/metrics/hr` | `days` |
| `fetchCoverage` | `/api/metrics/coverage` | single object |

The six ranged calls receive the same `from`/`to` from one inclusive IST window of
30 days ending today. Coverage takes no range.

Wire types live in `lib/api/types.ts` and mirror the API contract: required keys,
`null` for a missing measurement, and `[]` for an empty list. A response whose
root or list shape is wrong raises a contract error instead of rendering a
fabricated empty screen.

HR, temperature and vitals series arrive as compact day blocks. `lib/api/compact.ts`
pairs second offsets with values once, keeps the day key exactly, and rejects a
block whose offsets and values differ in length. Missing days stay gaps; the
charts never interpolate or join them.

## Views

- Overview: persisted readiness rings, the daily read, the readiness detail panel,
  null-aware step/readiness/sleep/stress averages, PAI, TRIMP and workout calories.
- Sleep: main session and naps, stage breakdown including wake minutes, a
  truncation warning when the stored timeline is incomplete, and the daily rollup
  trend.
- Activity: recorded workouts and automatic movement in two sections, plus a
  workout-only duration chart.
- Vitals: selected-day chips, continuous heart rate, one chart per series metric
  and on-wrist skin temperature samples.

`SyncStatusBar` shows coverage facts: whether data exists, the last ingest time,
the latest data watermark and the stream count. It does not claim the data is
current and does not refresh itself.

## Naming and missing data

- `main` is the main sleep session for the day; `naps` are separate and unscored.
  The daily non-nap total is labeled apart from the main session duration.
- Automatic activities are heuristic sustained movement from step and heart-rate
  minutes. The Walk or Run label is the server label and is never reclassified in
  the browser.
- Readiness is the stored score, band, status, baseline nights and all seven
  components. The browser never recomputes a score, weight or baseline.
- Nightly skin temperature and its signed deviation are the stored temperature
  readings. PAI is shown in points, training load as TRIMP, and workout
  calories are never presented as total daily burn.
- SpO2 shows the sample count. A daily or nightly average needs three valid
  samples; below that the value is missing, never 100.

## Routes

`/` is the private dashboard, `/login` issues a session and `/about` is public.
`/api/auth/login` and `/api/auth/logout` manage the cookie. There is no demo route
and no public dashboard data. The app also has loading, error and not-found
components.

## Implementation locations

- Charts use `components/charts`, Recharts and the typed wire data.
- Date and selection helpers use `lib/dates.ts` and `lib/dashboard.ts`.
- Transport and signing use `lib/api`; only Node server code imports them.

See [authentication](auth.md) for runtime and secret boundaries.

Validation: not run for this revision.
