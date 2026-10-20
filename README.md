# Heliolytics Web

Private browser dashboard for Heliolytics. The Next.js server signs requests to
the Go API; the browser shows overview, sleep, activity and vitals views.

## How it works

1. Sign in with the owner's password.
2. Middleware verifies the signed browser-session cookie.
3. `app/page.tsx` builds one IST snapshot window (`istRange(30)`) and starts
   seven server-side reads: six ranged routes plus coverage.
4. `DashboardApp` manages tabs, the selected day and the 7/30-day range.
5. Recharts renders the stored values. Tab, day and range changes make no new
   API calls.

The API key stays server-side. The browser receives metric data only, and the
open page is a snapshot with no polling.

## Requests

Each request is signed with the v2 scheme in `lib/api/signing.ts`. The canonical
text is nine newline-joined lines: `v2`, kid, timestamp, nonce, uppercase method,
escaped path, raw query, body SHA-256 and the exact Content-Type. A GET signs an
empty body and an empty Content-Type. Headers are `X-Heliolytics-Auth` and
`X-Heliolytics-Content-SHA256`. The URL is built once and split for signing, so
the signed path and query are the bytes that reach the socket.

Reads and their responses:

| Function | Route | Collection |
|---|---|---|
| `fetchDays` | `/api/v1/daily-metrics` | `days` |
| `fetchSleep` | `/api/v1/sleep` | `days` |
| `fetchActivities` | `/api/v1/activities` | `activities` |
| `fetchTemperature` | `/api/v1/metrics/temperature` | `days`, compact |
| `fetchSeries` | `/api/v1/metrics/series` | `days`, compact |
| `fetchHeartRate` | `/api/v1/metrics/hr` | `days`, compact |
| `fetchCoverage` | `/api/v1/metrics/coverage` | one object |

Compact days pair second offsets with values. Unequal lengths are a contract
error for the whole response; unusable points are dropped without a partial
screen. The client does not retry a 401 or a 429 automatically.

## What the dashboard shows

- One shared IST range. A 30-day window starts today minus 29 and dates never
  depend on the browser timezone.
- Sleep main vs naps: `main` is the main session, naps are listed separately and
  are never scored. The daily non-nap total is labeled apart from the main
  session, and a stored truncation flag is shown as a warning.
- Activities split by `kind` into recorded workouts and automatic movement. Both
  keep start, end, duration, calories, steps, min/average/max heart rate and the
  `hasDetail` indicator. Nothing is deduplicated in the browser.
- Readiness is the persisted score, band, status, algorithm version, baseline
  nights and all seven components. Calibrating, no-baseline and no-data states
  are distinct and never show a guessed score.
- Vitals use the stored names: nightly skin temperature, skin temperature
  deviation, PAI points, TRIMP training load and workout calories. SpO2 shows a
  sample count and stays missing until three valid samples exist.
- A null value is `n/a` or an explicit missing note. A known zero stays zero.

Heliolytics readiness v1 is a research-informed product score. Its weights are
versioned product choices, not a validated medical formula, and it is not a Zepp
or WHOOP equivalent. Automatic movement is a heuristic, not a decoded vendor
sport.

## Stack and configuration

Next.js 14, React 18, TypeScript, Tailwind, Recharts and Vitest are declared in
`package.json`. `server-only` keeps transport, signing and the login guard out of
Client Components.

| Variable | Purpose |
|---|---|
| `HELIOLYTICS_WEB_PASSWORD_HASH` | Owner's scrypt password verifier |
| `HELIOLYTICS_SESSION_SECRET` | Independent 64 lowercase hex session secret |
| `HELIOLYTICS_API_KEY` | This instance's own key, `web.<64 lowercase hex>` |
| `API_INTERNAL_URL` | Go base URL, `http://api:8080` inside Compose |
| `TRUST_PROXY` | `true` only with the isolated cloudflared ingress |
| `COOKIE_SECURE` | Explicit boolean; must be `true` in production |

`scripts/validate-runtime.mjs` runs as a Node preload for `npm run dev`,
`npm run start` and the image command. It validates the fields above before the
server listens, rejects malformed values, the published example secret and a
session secret equal to the API key, and prints a field name and rule only.
`npm run build` never runs the preload and needs no secret.

Production requires `TRUST_PROXY=true` and `COOKIE_SECURE=true`. Login trusts one
syntactically valid `CF-Connecting-IP` only because the web port is reachable
solely through cloudflared; that is an ingress property, not a claim that Next
sees the socket peer. Cookies are Secure, HttpOnly, SameSite=Lax and Path=/ for
issue, renewal and logout, and responses carry `Strict-Transport-Security` with
`max-age=31536000`. Edge HTTPS redirect is an owner step outside this repository.

Generate the password verifier with `npm run auth:hash-password`. Single-quote it
in any dotenv file so the `$` bytes survive.

## Run and verify

```bash
npm run test
npm run typecheck
npm run lint
npm run test:live   # requires a local seeded API and a web key
```

`npm run test:live` reads `HELIOLYTICS_TEST_API_URL` and
`HELIOLYTICS_TEST_API_KEY`, fails when either is missing or the host is not
loopback, and proves signed reads plus 403 on both write routes. It never runs
against production.

The image is built from `Dockerfile` with digest-pinned Node 24.22.0 stages,
`npm ci`, a nonroot `node` user and `GIT_SHA`/`BUILD_TIME` build args for the OCI
labels. Keep `/tmp` and `/app/.next/cache` writable for the read-only runtime.

Read [dashboard](docs/features/dashboard.md) and [authentication](docs/features/auth.md).
[Apache License 2.0](LICENSE).

Validation: not run for this revision.
