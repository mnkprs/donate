# Post-Epic Action Backlog

> **Purpose:** Single home for deferred actions, follow-ups, and open decisions accumulated across Epics 1–5. Per project decision, these are **not actioned mid-epic** — they are revisited and prioritized **after all planned epics are shipped**.
> **Status:** OPEN backlog — last updated 2026-05-22 (after Epic 5 Tasks 2–6 landed).
> **Convention:** Each item links its origin epic plan and a one-line trigger/condition for when it becomes actionable. `VERIFY` = needs a quick confirmation it isn't already resolved.

---

## Cross-cutting

| # | Item | Origin | Trigger / Notes |
|---|---|---|---|
| X1 | ESLint backlog set to `continue-on-error` in CI | Epic 5 validation note | Clear the lint backlog and flip CI to fail-on-error once the noise is triaged. |
| X2 | Confirm fee math is consistent end-to-end | Epic 2 (HIGH risk) | Epic 2 row labels (Eudaimonia 1%, Endaoment overhead, card processing) were illustrative. Now that Epic 3 (processor fee) and Epic 4 (router hardcoded 1%) have shipped, lock the exact percentages in `fees.ts` constants and reconcile all three against product. |

---

## Epic 1 — Landing ([plan](prompts/epic-1-landing-plan.md))

| # | Item | Status | Trigger / Notes |
|---|---|---|---|
| E1.1 | `LiveReceiptStrip` landing section | OPEN | Deferred — needs Epic 6 live-receipt data. Build as a follow-up once Epic 6 ships a queryable recent-donations source. |

> Resolved (no action): `CreamBand`, `HowItWorks`, `ClosingCTA`, `AuthorityStrip` shipped in follow-ups; Endaoment Org ID `TODO-*` stubs removed in Epic 5 Task 1.

---

## Epic 2 — Checkout ([plan](prompts/epic-2-checkout-plan.md))

| # | Item | Status | Trigger / Notes |
|---|---|---|---|
| E2.1 | Fee percentages locked by product | OPEN | See X2 — single named-constants block in `fees.ts`, reviewed by Epic 3/4 owners. |
| E2.2 | 4-stage `ProcessingStrip` / richer receipt stage composition | OPEN | Originally deferred Epic 2→3→5. Epic 5 built the live processing screen + receipt route, but **off-chain swap/settlement stages** the `DonationRouted` event does not carry remain a follow-up (see E5.4). |

> Resolved (no action): `stubSubmit` handoff replaced by `realSubmit` in Epic 3.

---

## Epic 3 — On-ramp ([plan](prompts/epic-3-onramp-plan.md) · [remediation](prompts/epic-3-onramp-remediation-plan.md))

| # | Item | Status | Trigger / Notes |
|---|---|---|---|
| E3.1 | Persistent session/transaction store | OPEN | In-memory store is MVP-only. Move to Postgres/Redis (project already has a KV interface in `src/lib/kv/`) before any multi-instance / production deploy. |
| E3.2 | Route-layer rate limiting on `/api/onramp/session` | OPEN | Idempotency via `clientRequestId` is client-trust; a misbehaving client could spam Stripe. Add server-side rate limiting. |
| E3.3 | L1 — webhook handler comment tightened (`webhook-handler.ts` ~111–116) | VERIFY | Remediation plan task; confirm the comment no longer implies Stripe redelivery after a 200. |

> Resolved (no action): L2 dead `stubSubmit.ts` deleted (confirmed gone 2026-05-22).

---

## Epic 4 — TransparentDonationRouter ([#5](https://github.com/mnkprs/donate/issues/5) · [plan](prompts/epic-4-router-plan.md))

| # | Item | Status | Trigger / Notes |
|---|---|---|---|
| E4.1 | Un-gate `test/fork/RouterFork.t.sol` | OPEN | Fork test `vm.skip`s unless `BASE_RPC_URL` + `ENDAOMENT_ORG` are set. Once real org addresses are confirmed (E5.1), wire the env and run the 1/99-split fork assertion in CI. |

> Resolved (no action): Task 7 receipt-decoder handshake (`DonationRouted` event shape) complete; consumed by Epic 5.

---

## Epic 5 — Endaoment Integration ([#6](https://github.com/mnkprs/Philotimo/issues/6) · [plan](prompts/epic-5-endaoment-plan.md))

| # | Item | Status | Trigger / Notes |
|---|---|---|---|
| E5.1 | **Source & commit real org Entity addresses** (PCRF / WCK / Direct Relief, Base + Base Sepolia) | OPEN — **blocks acceptance** | All three ship with `mainnetAddress`/`endaomentOrgAddress: null` (no fabricated placeholders, per plan). Until confirmed, `verifyDonation` returns `verified:false` (`no-org-address-for-chain`) and the acceptance criterion *"real Base Sepolia tx → Verified by Endaoment badge"* cannot pass. Source via a one-time live `fetchOrgByEin` call, then update `snapshot.json` + `orgs.ts`. |
| E5.2 | Fallback-policy granularity in `metadata.ts` | OPEN (decision) | Current policy: **any** API error → snapshot fallback; throw only when neither source has the EIN. Decide whether to distinguish retryable (503 → retry) from terminal (404 → skip fallback, throw). One-spot change in the catch block; case (a)/(b)/(c) tests unaffected. |
| E5.3 | Narrow `EndaomentOrgMetadata.mainnetAddress` back to `Address` | OPTIONAL | Widened to `Address \| null` to support the no-address state (E5.1). Narrow once real addresses are sourced, if a non-null guarantee is wanted. tsc currently clean either way. |
| E5.4 | Richer 5-stage receipt composition | OPEN (follow-up) | `/receipt/[txid]` resolves charity name + verification badge + on-chain gross/fee/net. Off-chain swap/settlement stage fields the `DonationRouted` event does not carry are out of Epic 5 scope. Ties to E2.2. |

> Implemented & green this session (no action): REST client, metadata + snapshot fallback, on-chain verification helper, Endaoment badge + attribution, `/receipt/[txid]` route. Full suite 623/623, `tsc --noEmit` clean.
