# Code Review: Epic 3 — Stripe Crypto Onramp (Phases 1–8)

**Reviewed**: 2026-05-20
**Scope**: Full onramp pipeline — env validation, pure builder, session store, three API routes, webhook state machine, client submit + adapter, E2E spec
**Decision**: APPROVE WITH COMMENTS (MVP/demo) — see "Pre-launch blockers" before any production deploy

## Summary

Strong, security-conscious work. The pure/impure seam is clean (testable handlers + thin route wiring), the idempotency-key-bound-to-payload-hash boundary is genuinely well-reasoned, the status route correctly narrows away PII/secrets, and the webhook handler's "terminal states are absorbing + settlement requires txHash" design is exactly right. No CRITICAL issues. The HIGH items are inherent to the documented in-memory MVP and must be closed before launch.

## Validation Results

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`) | Pass |
| Lint (`eslint`) | Pass (0 errors; 1 pre-existing warning in `stubSubmit.ts`) |
| Tests (`vitest`) | Pass (141/141) |
| Build | Skipped (not run this pass) |

## Findings

### CRITICAL
None.

### HIGH

**H1 — No rate limiting / abuse control on `POST /api/onramp/session`**
`src/app/api/onramp/session/route.ts`
The endpoint is unauthenticated and triggers a real outbound Stripe API call per request. An attacker can create unlimited onramp sessions (cost amplification + Stripe quota exhaustion + unbounded memory growth, see H2). Project `security.md` explicitly requires "Rate limiting on all endpoints." Acceptable for a local demo, **must** be addressed before launch (edge middleware / Upstash ratelimit keyed by IP + campaign).

**H2 — Unbounded in-memory growth across all three singletons**
`session-store.ts` (`records` Map), `session/route.ts` (`sessionIdempotencyIndex` Map), `webhook/route.ts` (`webhookProcessedEvents` Set)
None of these evict. The session store documents the in-memory MVP caveat, but the idempotency index and processed-event set carry the same liability and are not called out. Over long uptime this is a slow memory leak and a DoS surface (compounded by H1). The `KV_REST_API_*` env vars are already validated — the Redis/KV impl the repository seam was designed for should land before production.

### MEDIUM

**M1 — TOCTOU race on idempotent create**
`session/route.ts:166-203`
Two concurrent requests with the same key + same payload both miss the index (the `await createOnrampSession` yields the event loop between the `idempotency.get` check and the `idempotency.set`), so both call Stripe and create duplicate sessions; the second `set` wins. Low blast radius (no charge occurs until the hosted page), but it defeats idempotency under concurrency. A per-key in-flight promise map (or atomic KV set-if-absent in the durable impl) closes it.

**M2 — `console.error` as the logging path**
`session/route.ts:191`, `webhook/route.ts:78,88`
Already flagged with TODOs to swap for pino/winston. No secret leakage (verified: Stripe error body is truncated and secret-free, env keys never logged), so this is a maintainability/observability item, not security. Track it with the logger work.

### LOW

**L1 — Webhook "do not mark processed" comment vs. 200 response**
`webhook-handler.ts:111-116`
For an unknown session the handler returns without marking the event processed, with a comment that "a retry can still apply." But the route returns `200 {received:true}`, so Stripe will not redeliver — the retry path the comment relies on only fires on a non-2xx. The behavior is fine (no fabrication of sessions); the comment slightly overstates the retry guarantee. Tighten the comment or, if reprocessing-on-redeliver matters, reconsider the status code.

**L2 — Pre-existing unused-var warning**
`src/lib/checkout/stubSubmit.ts:16` — `_payload` unused. Out of epic scope; `stubSubmit` is the superseded stub. Candidate for deletion now that `realSubmit`/`submitDonation` are wired (dead-code cleanup).

## Notable strengths

- **Idempotency boundary** (`session/route.ts:18-21,163-182`): binding the client key to a payload hash so the key isn't a standalone capability handle is the correct security model, and the dangling-index fall-through is handled.
- **Status projection** (`status/[sessionId]/route.ts` + `OnrampStatusResponse`): correctly excludes `clientSecret`, `donorEmail`, `redirectUrl`; `no-store` on a polled, user-specific resource is right.
- **Webhook verification** over the raw body via Stripe's `constructEvent`, settlement gated on `transaction_id`, terminal-state absorption, and `event.id` idempotency — all sound.
- **Mainnet guard** (`createSession.ts:52-56`): refusing to address USDC to a non-existent mainnet router rather than misrouting funds is the right fail-closed choice.
- **E2E scope note** (`onramp.spec.ts:11-20`): the rationale for excluding the signature-gated webhook path from the black-box test is correct and well-documented.

## Files Reviewed

- `src/lib/env/server.ts` (Modified — Phase 1)
- `src/types/onramp.ts` (Added — Phase 2)
- `src/lib/onramp/createSession.ts`, `stripe.ts` (Added — Phase 2)
- `src/lib/onramp/session-store.ts` (Added — Phase 3)
- `src/lib/onramp/idempotency.ts` (Added — Phase 7 refactor)
- `src/app/api/onramp/session/route.ts` (Added — Phase 4)
- `src/lib/onramp/webhook-handler.ts`, `src/app/api/onramp/webhook/route.ts` (Added — Phase 5)
- `src/app/api/onramp/status/[sessionId]/route.ts` (Added — Phase 6)
- `src/lib/checkout/realSubmit.ts`, `submitDonation.ts` (Added — Phase 7)
- `src/components/checkout/CheckoutForm.tsx`, `src/app/donate/[campaignId]/page.tsx` (wiring)
- `e2e/onramp.spec.ts` (Added, untracked — Phase 8)

## Pre-launch blockers (before production)

1. H1 — rate limiting on the session route.
2. H2 — durable KV/Redis store + bounded idempotency index/processed-events (the seam already exists).
3. M2 — structured logger.
