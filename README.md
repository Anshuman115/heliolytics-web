# Heliolytics Web

Private browser dashboard for Heliolytics. The Next.js server fetches data from
Go; the browser displays overview, sleep, activity and vitals views.

## How it works

1. Sign in with the owner's password.
2. Middleware verifies the signed browser-session cookie.
3. `app/page.tsx` starts eight server-side Go API reads.
4. `DashboardApp` receives the data and manages tabs, day selection and 7/30-day ranges.
5. Recharts displays the selected data. Tab changes do not make new API calls.

The API signing secret stays server-side. The browser gets metric data, not that
secret. The open page is a snapshot; it has no polling or live push connection.

## What exists

- Daily rings, fixed-rule daily insight and movement charts.
- Selected-night sleep stages and historical sleep chart.
- Workout/automatic-session lists, HR, vitals and temperature charts.
- Sync status, password login/logout, public About and synthetic `/demo`.

There is no AI integration, profile editor, journal or workout-detail route here.
Some backend endpoints exist without a Web consumer.

## Stack and configuration

Next.js 14, React 18, TypeScript, Tailwind and Recharts are declared in `package.json`.

| Variable | Purpose |
|---|---|
| `HELIOLYTICS_WEB_PASSWORD_HASH` | Owner's scrypt password verifier |
| `HELIOLYTICS_SESSION_SECRET` | Independent 32-byte hex session secret |
| `HELIOLYTICS_SIGNING_SECRET` | API key shared with Go |
| `API_INTERNAL_URL` | Go base URL, `http://api:8080` inside Compose |
| `COOKIE_SECURE` | Optional cookie secure override |

Generate a password verifier with `npm run auth:hash-password`.
Keep all credentials in protected configuration.

## Run and deploy

With dependencies and environment configured, `npm run dev` starts development.
Verification commands: `npm run test`, `npm run typecheck`, `npm run build`. None
were run for this revision.

The checked-in deployment uses the sibling backend's Compose stack.
`./deploy.sh` delegates to its Web-only deployment script. It rebuilds Web;
`PULL=1 ./deploy.sh` also pulls its source first. This is a source build workflow,
not an implemented immutable-image CI pipeline.

Read [dashboard](docs/features/dashboard.md) and [authentication](docs/features/auth.md).
[Apache License 2.0](LICENSE).
