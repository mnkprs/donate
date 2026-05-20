# Epic 3 — Fiat-to-Crypto On-Ramp Backend — TDD Port Plan

## Context

Epic 3 (GitHub issue #4) wires the donor's fiat checkout (Epic 2) to Endaoment's
on-chain destination via a fiat-to-crypto on-ramp. The user enters card details
in Epic 2's `CheckoutForm`; Epic 3 turns that intent into a USDC settlement on
Base addressed to the Philotimo router contract (Epic 4), which deducts the 1%
platform fee and forwards the remainder to Endaoment.

This PR ships the **backend pipeline only**: on-ramp session creation, webhook
ingestion, durable session/transaction state, and the wiring from
`CheckoutForm`'s typed `onSubmit` callback (currently `stubSubmit.ts`) into a
real API route. Smart-contract integration, the receipt page, and the
4-stage processing UI are Epic 4 / Epic 5 scope.

The pattern continues from Epic 2: typed contracts, TDD per phase, pure modules
where possible, MSW for outbound HTTP in tests, no React Testing Library, and
SSR-tested routes via `renderToString` + substring assertions where applicable.

## Decisions Locked In

| Question | Decision | Source |
|---|---|---|
| On-ramp provider | **Stripe Crypto Onramp** (Stripe-hosted, KYC included, USDC on Base supported) | `docs/adr/0001-onramp-provider.md` |
| Platform fee mechanism | **On-chain via router contract** — on-ramp settles full gross USDC to router; router deducts 1% before forwarding to Endaoment | `docs/adr/0002-fee-collection.md` |
| HTTP mocking in tests | **MSW** (already wired into vitest setup in Phase 1) | Phase 1 commit `489c70d` |
| Env validation | **Zod schema in `src/lib/env/server.ts`** — fail-fast at boot (already shipped Phase 1) | Phase 1 commit `489c70d` |
| Session persistence | **Server-side in-memory store** for MVP, keyed by `sessionId`; interface is repository-pattern so a Postgres/Redis impl can drop in later | This PR |
| Webhook auth | **Stripe-signed events only** via `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`; reject anything else with 400 | This PR |
| Idempotency | Webhook handler keyed by Stripe `event.id`; replay returns 200 without re-mutating state | This PR |

## Target Architecture

```
src/app/api/onramp/
├── session/route.ts                POST → creates Stripe Crypto Onramp session
├── session/route.test.ts           unit: validates input, returns session payload, 4xx on bad input
├── status/[sessionId]/route.ts     GET → returns current OnrampSession state
├── status/[sessionId]/route.test.ts
└── webhook/route.ts                POST → Stripe-signed webhook ingestion
    webhook/route.test.ts           unit: signature verify, idempotency, state transitions

src/lib/onramp/
├── stripe.ts                       thin typed wrapper around `stripe` SDK; one place to read env
├── stripe.test.ts                  unit (with MSW): client constructs requests correctly
├── createSession.ts                pure-ish: input → Stripe session create payload
├── createSession.test.ts
├── session-store.ts                repository interface + in-memory impl
├── session-store.test.ts
├── webhook-handler.ts              pure: (event, store) → next OnrampSession state
└── webhook-handler.test.ts

src/lib/checkout/
├── stubSubmit.ts                   (existing) → replaced/extended by realSubmit
└── realSubmit.ts                   client fetch → POST /api/onramp/session, returns redirect URL
    realSubmit.test.ts              MSW-mocked happy path + error path

src/types/onramp.ts                 OnrampSession, OnrampStatus, CreateSessionInput, WebhookEvent (typed)

e2e/onramp.spec.ts                  full flow: checkout submit → /api/onramp/session 200 → redirect URL
```

## Reusable Pieces (from Phase 0 + Phase 1)

- **ADRs** in `docs/adr/0001-onramp-provider.md` and `docs/adr/0002-fee-collection.md` — single source of truth for provider choice + fee mechanics.
- **Env loader** `src/lib/env/server.ts` already validates `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ONRAMP_PUBLISHABLE_KEY`, `ROUTER_CONTRACT_ADDRESS`, `BASE_RPC_URL`, `ONRAMP_REDIRECT_URL`. No new keys this PR.
- **MSW** server already wired into `vitest.setup.ts` with strict unhandled-request blocking. New handlers go in `src/lib/msw/handlers/stripe.ts`.
- **Stripe SDK** installed Phase 1.
- **Checkout payload type** `CheckoutPayload` from `src/types/checkout.ts` is the input contract — Epic 3 consumes it without modification.
- **`stubSubmit.ts`** retains the typed signature; `realSubmit.ts` is a drop-in replacement.

## Phased TDD Plan

Each phase: RED → GREEN → REFACTOR → commit. One phase per conversation per
project rule [[feedback-tdd-workflow]]. Branch: `epic-3-onramp` per
[[feedback-epic-branching]].

### Phase 0 — ADRs (DONE, commit `f571582`)

- `docs/adr/0001-onramp-provider.md` — Stripe Crypto Onramp.
- `docs/adr/0002-fee-collection.md` — on-chain fee deduction in router.

### Phase 1 — Tooling, env loader, MSW (DONE, commit `489c70d`)

- Stripe SDK installed.
- `src/lib/env/server.ts` + 9 tests.
- MSW server wired into vitest.
- `.env.local.example` documents all server secrets.

### Phase 2 — Stripe client wrapper + createSession (pure layer)

**Why first:** Lock the request shape against Stripe's API in pure code before
wiring it to a route. MSW lets us assert the exact outbound payload.

1. `src/types/onramp.ts` — `OnrampSession`, `OnrampStatus` (`"created" | "pending" | "settled" | "failed"`), `CreateSessionInput` (mirrors `CheckoutPayload` plus router address as destination).
2. **RED** `src/lib/onramp/createSession.test.ts` — for input `{ grossCents: 5000, donorEmail, campaignId }`:
   - Builds Stripe payload with `transaction_details.destination_currency="usdc"`, `destination_network="base"`, `destination_amount` computed from gross USD → USDC at 1:1, `destination_wallet_address` = router contract address, `customer_information.email` = donor email, `metadata.campaign_id` = campaignId.
   - Throws on `grossCents <= 0`, missing email, missing campaign.
3. **GREEN** `src/lib/onramp/createSession.ts` — pure function `buildSessionRequest(input, env)`.
4. **RED** `src/lib/onramp/stripe.test.ts` (with MSW) — `createOnrampSession(input)` POSTs to Stripe's expected endpoint with bearer auth, returns parsed `{ id, client_secret, redirect_url, status }`. Asserts handler receives the exact body from step 3.
5. **GREEN** `src/lib/onramp/stripe.ts` — thin wrapper. Reads `STRIPE_SECRET_KEY` from `env`. Returns typed `OnrampSession`.

**Verify:** `npm run test src/lib/onramp` → green. `npm run typecheck` → green.

### Phase 3 — Session store (repository pattern, in-memory MVP)

**RED** `src/lib/onramp/session-store.test.ts`:
- `get(sessionId)` returns `undefined` for unknown id.
- `put(session)` then `get(session.id)` returns the same record.
- `update(sessionId, patch)` returns new session with patch applied, original immutable (no in-place mutation — see [[coding-style.md]]).
- `update` on unknown id throws.
- Records survive across calls in the same process (Map-backed); explicit `reset()` for tests.

**GREEN** `src/lib/onramp/session-store.ts`:
```ts
export interface SessionStore {
  get(id: string): OnrampSession | undefined;
  put(session: OnrampSession): void;
  update(id: string, patch: Partial<OnrampSession>): OnrampSession;
}
export const inMemorySessionStore: SessionStore = { /* ... */ };
```

### Phase 4 — POST /api/onramp/session route

**RED** `src/app/api/onramp/session/route.test.ts`:
- Valid `CheckoutPayload` → 200 with `{ sessionId, redirectUrl }`; session persisted in store with status `"created"`.
- Invalid payload (missing email, gross ≤ 0) → 400 with typed error envelope.
- Stripe failure (MSW returns 500) → 502 with error envelope; no session persisted.
- Idempotency: same `clientRequestId` header → returns the existing session, doesn't call Stripe twice.

**GREEN** `src/app/api/onramp/session/route.ts`:
1. Parse + validate body via Zod schema derived from `CreateSessionInput`.
2. Build Stripe request via `buildSessionRequest`.
3. Call `createOnrampSession`.
4. Persist into store.
5. Return `{ sessionId, redirectUrl }`.

### Phase 5 — POST /api/onramp/webhook route

**Why this phase is the riskiest:** signature verification + state machine + idempotency in one route. Tested heavily before wiring.

**RED** `src/lib/onramp/webhook-handler.test.ts` (pure handler):
- `crypto_onramp_session.created` → status transitions to `"pending"`.
- `crypto_onramp_session.fulfilled` → status `"settled"`, stores tx hash from event payload.
- `crypto_onramp_session.failed` → status `"failed"`, stores failure reason.
- Unknown session id → handler is a no-op, returns existing store unchanged (don't 404 — Stripe retries).
- Replay (same `event.id`) → state unchanged, idempotent.

**GREEN** `src/lib/onramp/webhook-handler.ts` — pure `(event, store) => void`.

**RED** `src/app/api/onramp/webhook/route.test.ts`:
- Valid Stripe signature → handler called, 200 returned.
- Invalid signature → 400, handler NOT called.
- Missing signature header → 400.
- Handler throws → 500 (so Stripe retries), error logged.

**GREEN** `src/app/api/onramp/webhook/route.ts` — reads raw body, verifies via `stripe.webhooks.constructEvent`, dispatches to `webhook-handler`.

### Phase 6 — GET /api/onramp/status/[sessionId] route

**RED** `src/app/api/onramp/status/[sessionId]/route.test.ts`:
- Known id → 200 with `OnrampSession` payload (status + tx hash if settled).
- Unknown id → 404 with error envelope.

**GREEN** route — single store read, typed response.

### Phase 7 — Client-side `realSubmit.ts` + wire into CheckoutForm

**RED** `src/lib/checkout/realSubmit.test.ts` (MSW-mocked):
- POSTs `CheckoutPayload` to `/api/onramp/session`.
- On 200 → returns `{ redirectUrl }`.
- On 4xx/5xx → throws typed `OnrampError` with the server-provided message.
- Includes a `clientRequestId` (UUID) header for idempotency.

**GREEN** `src/lib/checkout/realSubmit.ts`.

**Modify** `src/app/donate/[campaignId]/page.tsx` to use `realSubmit` instead of `stubSubmit`. `CheckoutForm` is unchanged — its typed `onSubmit` prop is the seam.

**Modify** `CheckoutForm` only if needed: on successful submit, navigate to `redirectUrl` (via `window.location.assign` or `router.push` for relative). Add a test asserting the redirect call.

### Phase 8 — E2E + verification

**RED → GREEN** `e2e/onramp.spec.ts`:
- Stub Stripe at the network layer via Playwright route interception.
- Navigate to `/donate/pcrf` → fill $50 + email → submit.
- Assert browser is redirected to the stubbed Stripe redirect URL.
- Simulate webhook POST → assert `/api/onramp/status/[id]` returns `"settled"`.
- Lighthouse a11y ≥ 95 on `/donate/pcrf` (regression gate).

### Phase 9 — Review + commit + PR

1. Strip dead code: `stubSubmit.ts` retained only if still referenced by tests; otherwise delete.
2. Run full suite: `npm run test`, `npm run typecheck`, `npm run test:e2e`, `npm run build`.
3. Conventional commit per phase; final umbrella PR title `feat(onramp): Stripe Crypto Onramp backend pipeline`.
4. PR description: list ADRs, link issue #4, call out scope boundary (no smart-contract integration; that's Epic 4).

## Files to Modify / Create

**Create:**
- 3 API routes + 3 tests
- 5 `src/lib/onramp/*` modules + 5 tests
- 1 client submit module + 1 test
- 1 type file (`src/types/onramp.ts`)
- 1 Playwright spec
- 1 MSW handler module for Stripe

**Modify:**
- `src/app/donate/[campaignId]/page.tsx` — swap `stubSubmit` → `realSubmit`.
- `CheckoutForm.tsx` — add redirect-on-success behavior (minimal).
- `src/lib/msw/handlers.ts` — register Stripe handler.

**Already shipped (Phases 0–1):**
- `docs/adr/0001-onramp-provider.md`, `docs/adr/0002-fee-collection.md`.
- `src/lib/env/server.ts` + tests.
- `src/lib/msw.test.ts`, vitest MSW wiring.
- `.env.local.example` server-side secrets section.

## Verification (end-to-end)

1. `npm run test` → all units green (~30+ new tests).
2. `npm run typecheck` → no `any`, no errors.
3. `npm run test:e2e` → onramp spec passes alongside checkout spec.
4. `npm run build` → production build succeeds.
5. Manual: `STRIPE_SECRET_KEY=sk_test_... npm run dev`, visit `/donate/pcrf`, submit, get redirected to Stripe's hosted onramp test page.

## Risks

- **HIGH** — Webhook signature verification is the system's auth boundary. A bug here = anyone can mark sessions settled. Mitigation: tested first (Phase 5), `stripe.webhooks.constructEvent` is the only acceptable path, signature secret rotation documented in `.env.local.example`.
- **HIGH** — In-memory session store loses state on process restart. Acceptable for MVP demo, **not** production. Mitigation: repository interface is the seam; document in PR that production needs Postgres/Redis before public launch.
- **MEDIUM** — Stripe Crypto Onramp testmode coverage. Their sandbox supports USDC-on-Base but settlement timing is not realistic. Mitigation: E2E uses Playwright route interception, not live Stripe.
- **MEDIUM** — `CheckoutForm` redirect on submit changes UX semantics from "stay on page" to "leave site for Stripe". Mitigation: test asserts the new behavior; QA visually verifies before merge.
- **LOW** — Idempotency via `clientRequestId` header is client-trust. A misbehaving client could spam Stripe. Mitigation: rate-limit at the route layer (defer to a follow-up if needed; not Epic 3 scope).

## Out of Scope (explicit)

- Router contract deployment, USDC forwarding, on-chain fee deduction — **Epic 4**.
- Receipt / thank-you page after settlement — **Epic 5**.
- 4-stage `ProcessingStrip` animation tied to webhook events — **Epic 5**.
- Persistent (Postgres/Redis) session store — follow-up; in-memory is MVP-only.
- Email receipts, refunds, recurring donations — explicit non-goals.
- Multi-currency or non-USD donations — USD only at launch.
