# Dashboard

## One server fetch, then browser interaction

```text
app/page.tsx -> eight parallel signed API reads
  -> DashboardApp -> OverviewView / SleepView / ActivityView / VitalsView
```

`DashboardApp` manages the tab, selected day and 7/30-day range. These controls
filter data already received. They do not fetch additional history.
`app/page.tsx` collects individual errors and renders the available results.

## Actual data reads

| Client function | Backend path |
|---|---|
| `fetchDays` | `/api/v1/daily-metrics` |
| `fetchSleep` | `/api/v1/sleep` |
| `fetchWorkouts` | `/api/v1/metrics/workouts` |
| `fetchActivitySessions` | `/api/v1/metrics/activity-sessions` |
| `fetchTemperature` | `/api/v1/metrics/temperature` |
| `fetchSeries` | `/api/v1/metrics/series` |
| `fetchHeartRate` | `/api/v1/metrics/hr` |
| `fetchCoverage` | `/api/v1/metrics/coverage` |

Endpoints and window constants are in `lib/api/endpoints.ts`; fetch functions
are in `lib/api/index.ts`. Metric requests use a 30-day lookback; workouts and
auto sessions use 90. The UI currently offers only 7/30-day views. Inclusive
server date ranges mean lookback values are not guaranteed row counts.

HR, temperature and vital series arrive as compact day blocks. The client pairs
second offsets with values and reconstructs timestamps. See `lib/api/compact.ts`
and HR expansion in `lib/api/index.ts`.

## Views

- Overview: rings, steps and fixed-rule `DailyInsight` text. No AI request.
- Sleep: selected-night summary/hypnogram and historical stage chart.
- Activity: charts plus workout and automatic-session lists. No detail route.
- Vitals: selected-day HR and loaded vital/temperature series.

`SyncStatusBar` shows coverage. It does not continuously refresh itself.
`cache: 'no-store'` bypasses server fetch caching, not the snapshot retained by an
already open browser page. There is no background polling or live stream.

## Routes

`/` is the private dashboard. `/login` signs in, `/demo` renders generated data,
and `/about` is public. `/api/auth/login` and `/api/auth/logout` handle sessions.
The app also has loading, error and not-found components.

## Implementation locations

- Charts use `components/charts`, Recharts and the existing typed data.
- Data sources use the backend contract, then `lib/api` and server page loading.
- Interactions use `DashboardApp` or a focused view component.
- Login behavior uses `lib/auth`, route handlers and middleware.

See [authentication](auth.md) for runtime and secret boundaries.
