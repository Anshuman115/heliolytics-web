# Feature: Auth

This is a single-owner dashboard. It has one human password, no user accounts and
no OAuth provider.

## Three separate secrets

| Variable | Purpose | Shared with |
|---|---|---|
| `HELIOLYTICS_WEB_PASSWORD_HASH` | Verify the human password | Nobody |
| `HELIOLYTICS_SESSION_SECRET` | Sign browser sessions | Nobody |
| `HELIOLYTICS_API_KEY` | Sign Web-to-Go reads | Go API, as the `web` key |

Never reuse one value for another purpose. None of these values may reach a
browser bundle. The web holds only its own `web.<hex>` key: it never receives the
phone key or the full API key ring, and the API never receives the session secret.

## Startup validation

`lib/auth/runtime_config.mjs` holds the shared grammar: scrypt constants, the
verifier parser and the API key parser. It is pure, reads no environment and has
no import-time side effects, so the password verifier, the hash CLI, signing and
startup validation cannot drift apart.

`scripts/validate-runtime.mjs` runs as a Node preload for `npm run dev`,
`npm run start` and the container command. It validates the environment before the
server listens and rejects a missing field, a plaintext or differently
parameterised verifier, a session secret that is not 64 lowercase hex, anything
other than one `web.<hex>` key, the published example secret, a session secret
equal to the API key, an unusable `API_INTERNAL_URL`, and a malformed boolean.
Failures print a field name and a rule only, never a value.

Production mode (`NODE_ENV=production`) requires `TRUST_PROXY=true` and
`COOKIE_SECURE=true`. `npm run build` does not run the preload and needs no
secret.

## Password verification

`lib/auth/password.ts` accepts only this format:

```text
scrypt$N=32768$r=8$p=3$<16-byte-salt-hex>$<32-byte-hash-hex>
```

Generate it locally. The CLI reads the password twice without echoing and writes
only the encoded hash to standard output:

```bash
npm run auth:hash-password
```

Malformed hashes and passwords above 256 UTF-8 bytes are rejected. Passwords are
not trimmed or normalized. Single-quote the verifier in a dotenv file so the `$`
bytes survive. Login counts the attempt before running scrypt.

## Browser session

The cookie is `HttpOnly`, `SameSite=Lax`, `Path=/` and `Secure` in production. Its
value is:

```text
<issuedAt>.<expiresAt>.<hexSignature>
```

The signature is HMAC-SHA256 over `<issuedAt>:<expiresAt>`. A valid session has
a rolling 7-day idle expiry and a 30-day absolute limit. Middleware renews it only
when less than 3 days remain and keeps the original `issuedAt`.

`sessionCookieSecure()` decides from configuration alone: production is always
Secure, and development honors an explicit `COOKIE_SECURE=false` for local HTTP.
A forwarded `x-forwarded-proto` header can never weaken the cookie. Issue, renewal
and deletion use one attribute set from `lib/auth/cookie_options.ts`.

## Route gate and login limit

`middleware.ts` protects every route except `/api/auth`, `/_next` and `/about`.
`safeRedirectPath` in `lib/auth/redirect.ts` prevents an external login redirect
and is Edge safe.

`lib/auth/login_guard.ts` allows ten attempts per client in a rolling 15-minute
window and returns `Retry-After` on the eleventh. State is bounded to 10,000
entries with least-recently-used eviction, expired entries are dropped on access
and by one unref'd periodic sweep, so no request scans the whole map. The timer is
stored on `globalThis` so module reloads do not stack it.

Next route handlers expose no socket peer address. In production trusted mode the
guard requires exactly one syntactically valid `CF-Connecting-IP`; a missing,
combined or unparseable value is a 400 before password verification. This is safe
only while the web port is reachable exclusively through cloudflared, which
overwrites that header. It is an ingress property enforced outside this
repository, not proof of provenance. In local development `TRUST_PROXY=false`
ignores every forwarded header and uses one shared bucket.

The limiter is in-memory and single-process. It resets on restart and does not
provide global brute-force protection across replicas.

## Go API signing

Server-side reads carry `X-Heliolytics-Auth` and `X-Heliolytics-Content-SHA256`.
The auth value is `<kid>.<ts>.<nonce>.<sig>`, where `sig` is HMAC-SHA256 over
eight newline-joined lines: kid, decimal seconds, 32 hex nonce, uppercase method,
escaped path, raw query, body hash and the exact Content-Type. A GET signs the
empty body hash and an empty final Content-Type field.

`lib/api/client.ts` builds the URL once, splits the same string for signing and
fetching, and never reorders, decodes or re-encodes the query afterwards. It sets
`cache: 'no-store'`, aborts after 15 seconds, keeps `Retry-After` as metadata on a
429, and never retries a 401 or 429. Errors expose a status, a machine code and
bounded text only, never raw upstream bodies or key material.

The web key is read-only by server policy. A correctly signed web write to
`POST /api/ingest` or `PUT /api/profile` is refused with 403 before the body
is read.

## Owner rotation

1. Generate a new password hash with `npm run auth:hash-password`.
2. Generate a separate session secret with `openssl rand -hex 32`.
3. Generate a fresh `web` key and register it in `HELIOLYTICS_API_KEYS` for Go.
4. Update protected deployment configuration and restart the web container.
5. Confirm the session secret differs from every API key without printing either.

Changing the session secret logs out every browser. Changing the web API key must
be coordinated with Go. Cloudflare HTTPS redirect, HSTS at the edge and any VPS
action remain owner steps.

Validation: not run for this revision.
