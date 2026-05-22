# Security Review — Epic 3 Stripe Crypto Onramp (2026-05-20)

Scope: payment/checkout path added/modified in commits `2010c52..4a5218b`.
Files audited: `session/route.ts`, `webhook/route.ts`, `status/[sessionId]/route.ts`,
`webhook-handler.ts`, `stripe.ts`, `createSession.ts`, `session-store.ts`,
`realSubmit.ts`, `submitDonation.ts`, `idempotency.ts`, `env/server.ts`, `next.config.ts`.

Verdict: **No CRITICAL issues.** The settlement-auth boundary and secret handling are
sound. Remaining findings are production-readiness gaps (DoS surface, durability) plus
defense-in-depth. The in-memory items are flagged as MVP in-code; they are listed here
because they are **launch blockers**, not new bugs.

> **UPDATE 2026-05-20 — H1, M1, M2 RESOLVED** (commits on `main`: KvStore+rate-limiter,
> async KV-backed stores, `@vercel/kv` adapter). A generic async `KvStore` (in-memory
> TTL+bounded for the demo, `@vercel/kv` durable in prod via `KV_REST_API_URL/TOKEN`)
> now backs the session store, webhook processed-event log, idempotency index, and a
> fixed-window per-IP rate limiter; `POST /api/onramp/session` returns 429 `rate_limited`
> before any Stripe call. 439 tests green, tsc + eslint clean. **L1–L3 remain open.**

---

## HIGH

### H1 — No rate limiting on the unauthenticated, cost-amplifying session endpoint
`POST /api/onramp/session` is public (donations need no login) and each accepted call
triggers a **billable** Stripe API request (`createOnrampSession` → `stripe.ts:55`). There
is no rate limiter anywhere in source (`next.config.ts` empty, no `middleware.ts`). An
attacker can loop valid payloads to (a) run up Stripe cost / hit Stripe rate limits for
real donors, and (b) amplify M1 memory growth. The status route is also pollable and the
webhook runs HMAC verification per request.
- Fix: add per-IP rate limiting (e.g. `@upstash/ratelimit` over the KV already configured
  in env) on `/api/onramp/session`, stricter than on `/status`. Return `429`.

---

## MEDIUM

### M1 — Unbounded in-memory growth → memory-exhaustion DoS
Three process-global structures grow forever with no TTL/eviction; every unauthenticated
POST adds permanent entries:
- `sessionIdempotencyIndex` — `session/route.ts:210`
- `webhookProcessedEvents` — `webhook/route.ts:109`
- `inMemorySessionStore` records — `session-store.ts:28`

Combined with H1 this is a cheap OOM. Fix is the same as M2: move to a TTL-backed store.

### M2 — Per-process state silently breaks on serverless / multi-instance
On Vercel (or any >1 instance / cold-start deploy) the store, `processedEvents`, and the
idempotency index are **not shared** across lambdas. Consequences:
- Webhook replay protection and terminal-state absorption (`webhook-handler.ts:92,119`)
  fail across instances → a settled session can be reprocessed on another lambda.
- Idempotency cache misses → the *same* donor retry creates a **second billable** Stripe
  session.

The seam already exists (`SessionStore` interface) and env already declares
`KV_REST_API_URL` / `KV_REST_API_TOKEN` — wire a Redis/KV implementation backing the store,
the processed-event set, and the idempotency index before any multi-instance deploy.

---

## LOW / Defense-in-depth

### L1 — Tighten redirect URL to `https:` only
`stripeOnrampResponseSchema.redirect_url` uses `z.string().url()` (`stripe.ts:33`), which
accepts non-HTTP schemes (`javascript:`, `data:`). That value flows server → client →
`window.location.assign(redirectUrl)` (`submitDonation.ts:8,34`). The source is Stripe over
TLS (not attacker-controlled), so risk is low — but restrict the schema to a `https:` prefix
(or `https://*.stripe.com`) as defense-in-depth against a spoofed/changed upstream response.

### L2 — No security headers / CSP
`next.config.ts` is the empty default. Before launch add `headers()` with HSTS,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` / `frame-ancestors 'none'`,
`Referrer-Policy`, and a CSP (start strict; the Stripe-hosted onramp is a redirect, not an
embed, so `connect-src 'self'` should suffice).

### L3 — Logger redaction
`webhook/route.ts:78,88` and `session/route.ts:191` log full `err` via `console.error`
(already TODO'd to swap for pino/winston). When that swap happens, ensure donor email (PII,
stored in-memory on the session) and any Stripe body are redacted. Low risk today.

---

## Verified-good (no action — confirms prior hardening held)
- Webhook verifies via Stripe's audited `constructEvent` over **raw bytes**, requires the
  `stripe-signature` header, and re-validates the payload shape with Zod even post-signature.
- Settlement requires a `transaction_id`/hash; a hash-less `fulfillment_complete` throws →
  500 → Stripe retry, never a permanent hash-less terminal record (`webhook-handler.ts:132`).
- Idempotency key is bound to a payload **hash**, not the key alone, so a client key is not a
  capability handle to another donor's session (`session/route.ts:106,169`).
- Status route returns a **narrow** projection (no `clientSecret`, no donor PII) with
  `cache-control: no-store` (`status/[sessionId]/route.ts:36,56`).
- Secrets are env-only, Zod-validated at first request; the builder refuses mainnet routing
  while no mainnet router is configured (`createSession.ts:52`).
- Server Zod schema enforces the amount envelope + field length caps before any Stripe call.
- Classic CSRF N/A: no cookies/session to ride; JSON-only state-changing endpoint.
