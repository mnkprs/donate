# Epic 3 On-Ramp — Code Review Remediation Plan

**Created**: 2026-05-20
**Source review**: `.claude/reviews/epic-3-onramp-review.md`
**Status**: APPROVED — ready to implement
**Scope**: All six review findings (H1, H2, M1, M2, L1, L2)
**Infra direction**: Vercel KV + `@upstash/ratelimit`

---

## Locked Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Structured logger | **pino** (no worker transport — plain JSON to stdout to avoid Next.js bundling issues) |
| 2 | KV-unreachable behavior | **fail-open** — see carve-out below |
| 3 | M1 idempotency loser behavior | **re-read the index and return the winner's session** (not a 409) |

### Decision 2 carve-out (settlement safety)
Fail-open is the default everywhere **except the webhook processed-events idempotency check**, which stays **fail-closed**. Rationale: a KV miss there would let a settlement event be processed twice. On KV failure during the processed-events `SET … NX`, the webhook returns **500** so Stripe retries (at-least-once is safe; double-settlement is not). All other KV failures (rate limiter, session store reads, idempotency index) fail-open so a transient KV blip never blocks a donor.

| Surface | KV failure policy |
|---------|-------------------|
| Rate limiter (H1) | fail-open (allow the request) |
| Session store read/write (H2) | fail-open (proceed; log) |
| Idempotency index read/write (H2/M1) | fail-open (proceed to create) |
| **Webhook processed-events `SET NX` (H2)** | **fail-closed → 500, Stripe retries** |

---

## Requirements

| ID | Finding | Fix |
|----|---------|-----|
| H1 | No rate limiting on `POST /api/onramp/session` | IP+campaign rate limiter, injected dep, returns 429 |
| H2 | Three unbounded in-memory singletons | Durable KV-backed store + idempotency index + processed-events, all TTL-bounded |
| M1 | TOCTOU race on idempotent create | Atomic KV `SET … NX` reservation; loser re-reads index and returns the winner's session |
| M2 | `console.error` as logging path | pino structured logger; replace 3 call sites |
| L1 | Webhook "do not mark processed" comment overstates retry guarantee | Tighten comment (behavior unchanged) |
| L2 | Dead `stubSubmit.ts` (+ unused-var warning) | Delete after confirming no importers |

---

## Central Architectural Decision: `SessionStore` becomes async

Today `SessionStore` is **synchronous** (`get(id): OnrampSession | undefined`). KV is network-bound, so `get/put/update` must return `Promise`. This ripples into:

- **Webhook handler** (`applyOnrampSessionEvent`, currently sync) → becomes async. *Settlement-critical — highest risk.*
- **Status route** (`status/[sessionId]/route.ts`) → `await` the store.
- **Session route** (`session/route.ts`) → already async; add `await`.
- **Every test** driving these.

**Impl selection:** keep an in-memory **async** `SessionStore` for tests and local dev; wire the KV impl in production. A factory selects based on env (KV vars already validated in `src/lib/env/server.ts`).

---

## Phases (TDD: RED → GREEN → REFACTOR per phase)

### Phase A — Structured logger (M2) *[isolated, do first]*
- Add `pino`. New `src/lib/log/logger.ts`: leveled JSON logger, **no worker transport** (plain stdout) to dodge Next.js bundling pitfalls. Configure `redact` for known secret-shaped keys (`STRIPE_SECRET_KEY`, `STRIPE_ONRAMP_WEBHOOK_SECRET`, `KV_REST_API_TOKEN`, `authorization`, `clientSecret`).
- Replace the 3 `console.error` sites — `session/route.ts:191`, `webhook/route.ts:78,88` — and delete their `// TODO: swap console for a structured logger` comments.
- **Tests:** emits a structured record at the correct level; redacts secret-shaped fields; never serializes raw secrets.

### Phase B — Async `SessionStore` + KV impl (H2 part 1) *[highest risk]*
- Convert `SessionStore` interface to async (`Promise`-returning `get/put/update`/`reset`).
- Update `inMemorySessionStore` to satisfy the async interface (used by tests + local).
- New `src/lib/onramp/kv-session-store.ts`: KV-backed, keys `onramp:session:{id}`, **TTL ~72h** (bounds growth).
- Add a store factory (`getSessionStore()`) selecting in-memory vs KV based on env / `NODE_ENV`.
- Migrate callers to `await`: webhook handler (sync→async), status route, session route.
- Update all affected unit/integration tests to async.
- **Verify the webhook invariants survive the migration:** terminal-state absorption, settlement requires `transaction_id`, `event.id` idempotency.

### Phase C — KV idempotency index + processed-events + TOCTOU lock (H2 part 2 + M1)
- Move `sessionIdempotencyIndex` → KV: `onramp:idem:{clientRequestId}` → `{ sessionId, payloadHash }`, **TTL ~24h**.
- Move `webhookProcessedEvents` → KV: `onramp:webhook:evt:{eventId}` via `SET … NX`, **TTL ~72h**. (Fail-closed on KV error — see Decision 2 carve-out.)
- **M1 fix:** atomic `SET … NX` reservation on `clientRequestId` before the Stripe call.
  - Winner proceeds to create the Stripe session, then writes the real index entry.
  - **Loser re-reads the index** (brief bounded retry/poll) and returns the winner's session — no duplicate Stripe call, no 409.
  - Fail-open: if the reservation `SET` errors, proceed to create (matches Decision 2).
- **Tests:** two concurrent creates with the same key+payload call Stripe once and both receive the same `sessionId`; mismatched payload under a reused key still returns the 400 conflict; dangling-index fall-through still recreates.

### Phase D — Rate limiting (H1)
- Add `@upstash/ratelimit` (and `@upstash/redis` if the limiter needs its own client; otherwise reuse the existing KV connection).
- Inject a `RateLimiter` dep into the session handler (consistent with the existing DI seam — keeps the pure handler unit-testable).
- Sliding window (~**5 requests / 60s**) keyed by `IP + campaignId`. IP from `x-forwarded-for` (first hop) with a safe fallback.
- Add `rate_limited` to the `OnrampErrorCode` union (`src/types/onramp.ts`); return **429** with `OnrampErrorBody` + a `Retry-After` header.
- **Fail-open** on limiter/KV error (allow the request; log).
- Provide a **no-op limiter** for tests/local.
- **Tests:** handler returns 429 when the limiter denies; passes through when allowed; key derivation is correct; limiter error → request allowed (fail-open).

### Phase E — Cleanups (L1, L2)
- **L1:** tighten the `webhook-handler.ts` comment (~lines 111–116) so it no longer implies Stripe will redeliver after a 200 — state plainly that an unknown session is acknowledged without fabrication and is not reprocessed.
- **L2:** confirm no importers of `src/lib/checkout/stubSubmit.ts` (grep), then delete it and any stale test. Clears the pre-existing unused-var warning.

### Phase F — Verify
- `tsc --noEmit` — pass.
- `eslint` — 0 errors (the `stubSubmit` warning is gone after L2).
- `vitest run` — full suite green; coverage holds ≥ 80%.
- `next build` — succeeds.
- `playwright test` (`e2e/onramp.spec.ts`) — still green (the no-op limiter + in-memory async store keep E2E independent of live KV).

---

## New Dependencies
- `pino` (M2).
- `@upstash/ratelimit` (H1); possibly `@upstash/redis`. `@vercel/kv` already present.

---

## Risks

- **HIGH — async interface migration (Phase B):** touches the settlement-critical webhook handler. Mitigation: strict test-first migration; re-assert all webhook invariants before moving on.
- **MEDIUM — local/test ergonomics:** KV not available locally. Mitigation: in-memory async store + no-op limiter cover dev and the existing test/E2E suites without live KV.
- **MEDIUM — KV failure semantics:** fail-open default with the single fail-closed carve-out (webhook processed-events). Must be implemented and tested deliberately, not left implicit.
- **LOW — pino in Next.js:** avoid worker transports; emit plain JSON to stdout.

---

## Sequencing & Dependencies
```
A (logger)  ──►  used by B, C, D
B (async store + KV)  ──►  prerequisite for C
C (KV idem/events + M1)
D (rate limit)  ──►  independent of C, depends on KV being wired (B)
E (cleanups)  ──►  independent
F (verify)  ──►  last
```
Recommended order: **A → B → C → D → E → F**.

## Estimated Complexity: MEDIUM–HIGH
Phase B is the cost center (~40% of effort). Total ≈ 8–12 hours of focused TDD work.
