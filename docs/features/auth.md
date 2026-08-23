# Feature: Auth

This is a single-owner dashboard. It has one human password, no user accounts,
and no OAuth provider.

## Three separate secrets

| Variable | Purpose | Shared with |
|---|---|---|
| `HELIOLYTICS_WEB_PASSWORD_HASH` | Verify the human password | Nobody |
| `HELIOLYTICS_SESSION_SECRET` | Sign browser sessions | Nobody |
| `HELIOLYTICS_SIGNING_SECRET` | Sign Web-to-Go requests | Go API |

Never reuse one value for another purpose. None of these values may reach a
browser bundle.

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
not trimmed or normalized. Login rate limiting runs before scrypt verification.

## Browser session

The cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` on HTTPS. Its
value is:

```text
v1.<issuedAt>.<expiresAt>.<hexSignature>
```

The signature is HMAC-SHA256 over `v1:<issuedAt>:<expiresAt>`. A valid session has
a rolling 7-day idle expiry and a 30-day absolute limit. Middleware renews it only
when less than 3 days remain and keeps the original `issuedAt`.

The old password-signed cookie format is rejected. Missing login-hash or session
configuration fails closed.

## Route gate

`middleware.ts` protects every route except `/api/auth`, `/_next`, `/demo`, and
`/about`. `safeRedirectPath` prevents an external login redirect. The login route
allows 10 attempts per IP per 15 minutes.

## Go API signing

Server-side requests carry `X-Heliolytics-Token`:

```text
ts.nonce.sig
sig = HMAC-SHA256(HELIOLYTICS_SIGNING_SECRET, "ts:nonce")
```

This format must stay byte-identical to the Go and Flutter implementations.
`lib/api/client.ts` is server-only and aborts a request after 15 seconds.

## Rotation

1. Generate a new password hash with `npm run auth:hash-password`.
2. Generate a separate session secret with `openssl rand -hex 32`.
3. Update protected deployment configuration.
4. Deploy Web and log in again.
5. Remove the old plaintext `HELIOLYTICS_WEB_PASSWORD` variable.

Changing the session secret logs out every browser. Changing the API signing
secret must be coordinated with Go and every App installation that uses it.
