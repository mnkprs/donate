# Post-Epic Action Backlog

> **Purpose:** Single home for (1) the **human-only go-live checklist** — external accounts, credentials, funded keys, on-chain actions, and legal/compliance work that an agent *cannot* do for you — and (2) deferred engineering follow-ups and open decisions accumulated across Epics 1–6. Per project decision, these are **not actioned mid-epic** — they are revisited **after all planned epics are shipped**.
> **Status:** OPEN backlog — last updated 2026-05-22.
> **Convention:** Each item links its origin (epic plan, env line, or runbook) and a one-line trigger/condition for when it becomes actionable. `VERIFY` = needs a quick confirmation it isn't already resolved.

---

## 🔑 Human-Only Go-Live Checklist (an agent cannot do these)

> Everything below requires a real account, a funded wallet, a signed legal document, or an irreversible on-chain broadcast. None of it can be completed from inside the codebase — it needs **you**, with credentials and judgment. Work top-to-bottom; later groups depend on earlier ones (accounts → keys → deploy → wire-up → launch).

### A. Accounts & API keys to register

| ✓ | Service | What to do | Lands in |
|---|---|---|---|
| ☐ | **Stripe Crypto Onramp** | Create/verify a Stripe account and **apply for Crypto Onramp access** (gated — needs business/KYB approval, not instant). Grab the **live** secret key, then create a webhook endpoint subscribed to `crypto.onramp_session.*` and copy its signing secret. | `STRIPE_SECRET_KEY`, `STRIPE_ONRAMP_WEBHOOK_SECRET` (`.env` 18–22) |
| ☐ | **RPC provider** (Alchemy / QuickNode) | Public `*.base.org` endpoints are dev-only and will rate-limit under real load. Register and create authenticated Base **mainnet** + **Sepolia** app URLs. | `NEXT_PUBLIC_BASE_RPC_URL`, `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` (`.env` 9–12) |
| ☐ | **Vercel KV / Upstash Redis** | Provision a KV store (replaces the MVP in-memory session store — see E3.1) and run `vercel env pull` to populate credentials. | `KV_REST_API_URL`, `KV_REST_API_TOKEN` (`.env` 24–27) |
| ☐ | **Basescan API key** | Register at basescan.org/myapikey for contract source verification during deploy. | `BASESCAN_API_KEY` (`DEPLOY.md` §Environment) |

### B. Wallets, keys & on-chain identities (funds + judgment required)

| ✓ | Item | What to do |
|---|---|---|
| ☐ | **Funded deployer key** | Fund a deployer account: testnet ETH for Base Sepolia, **real ETH** for Base mainnet. Use a keystore/Ledger, never a pasted plaintext key for mainnet. (`DEPLOY.md` §Prerequisites) |
| ☐ | **Treasury address** | Decide the address that receives the 1% platform fee. **Immutable once the router is deployed** — choose deliberately, ideally a multisig you control. (`DEPLOY.md` §2) |
| ☐ | **Owner / allowlist multisig** | Stand up a Safe multisig on Base mainnet to be `OWNER_ADDRESS`. The owner curates which Endaoment orgs can receive funds; review M4 mandates a **multisig in production**, not an EOA. (`DEPLOY.md` §Environment, H1/M4) |

### C. Endaoment data & relationship

| ✓ | Item | What to do |
|---|---|---|
| ☐ | **Real org Entity addresses** | Source and confirm the on-chain Entity address for each charity (PCRF / WCK / Direct Relief) on Base **and** Base Sepolia via Endaoment's `OrgFundFactory` / integration API, and confirm each one's `baseToken()` is canonical Base USDC. **Blocks acceptance** — see E5.1. Until done, `verifyDonation` returns `verified:false` and the "Verified by Endaoment" badge cannot pass. |
| ☐ | **Endaoment integration access** | Confirm whether production REST API use needs an account/partner key or any rate-limit allowance from Endaoment, and that the orgs you intend to route to are live on their platform. (`ENDAOMENT_API_URL`, `.env` 49–55) |

### D. Irreversible deploy & on-chain config (operator runbook: `contracts/DEPLOY.md`)

| ✓ | Step | What to do |
|---|---|---|
| ☐ | **Deploy to Base Sepolia first** | Run `forge script Deploy.s.sol --verify`, send a sample donation, confirm the 1/99 split on Basescan. (`DEPLOY.md` §1) |
| ☐ | **Deploy to Base mainnet** | Same command, mainnet USDC + RPC. **Double-check `TREASURY_ADDRESS` before broadcasting — immutable.** (`DEPLOY.md` §2) |
| ☐ | **Allowlist each org** | From the owner multisig, call `setOrgAllowed(<org>, true)` per charity. A fresh router has an **empty allowlist — every donation reverts with `OrgNotAllowed` until you do this.** (`DEPLOY.md` §3) |
| ☐ | **Wire deployed addresses into prod env** | Set `NEXT_PUBLIC_ROUTER_ADDRESS_BASE` / `_BASE_SEPOLIA` to the deployed addresses. (`DEPLOY.md` §4; un-gates E4.1 fork test) |

### E. Hosting & domain

| ✓ | Item | What to do |
|---|---|---|
| ☐ | **Production environment** | Set every server secret in the host (Vercel) project settings — secrets stay **server-only**, never `NEXT_PUBLIC_*`. Set `NEXT_PUBLIC_CHAIN=base` for production. |
| ☐ | **Custom domain + DNS** | Attach the production domain and configure DNS / TLS at the host. |

### F. Legal, compliance & trust (founder / counsel — not engineering)

| ✓ | Item | What to do |
|---|---|---|
| ☐ | **Charitable-solicitation / fundraising registration** | A platform soliciting donations may need state/jurisdiction fundraising registration. Confirm with counsel which apply. |
| ☐ | **Money-transmission / MSB analysis** | Routing fiat → stablecoin → charity may trigger money-transmitter / MSB obligations. Get a legal read **before** taking live payments. |
| ☐ | **Terms of Service + Privacy Policy** | Publish both; cover data handling for Stripe/onramp PII and the on-chain nature of donations (irreversible, public). |
| ☐ | **Tax-receipt responsibility** | Endaoment is the 501(c)(3) of record — confirm in writing **who issues the donor's tax receipt** and that the UI represents it accurately. |
| ☐ | **Fee-disclosure sign-off** | Product/legal sign-off that the donor-facing fee breakdown (Eudaimonia 1% + processor + Endaoment overhead) is accurate and consistent end-to-end. Ties to X2 / E2.1. |

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

---

## Epic 6 — Live Transparency Receipt Page ([#7](https://github.com/mnkprs/Philotimo/issues/7) · [plan](prompts/epic-6-receipt-page-plan.md) · [review](.claude/reviews/epic-6-receipt-review.md))

| # | Item | Status | Trigger / Notes |
|---|---|---|---|
| E6.1 | **Thread an explicit `chainId` into server-side OG metadata** | OPEN — **fix before mainnet** | Review H4. `loadReceiptForMetadata` defaults `chainId` to `baseSepolia.id`, and both callsites — `generateMetadata` (`app/receipt/[txid]/page.tsx`) and the OG image route (`opengraph-image.tsx`) — omit it. On Base **mainnet** this silently reads against Sepolia (`getRouterAddress` returns the Sepolia router; verification fails for real donations → generic fallback card). Latent today (whole app runs on Sepolia). Fix: source `chainId` from env (`NEXT_PUBLIC_CHAIN`) / route / searchParam and pass it explicitly; make the function default fail loudly instead of falling back to testnet. Ties to the `NEXT_PUBLIC_CHAIN=base` go-live step (§E). |
| E6.2 | Harden the network label in `buildReceiptBundle` | OPEN | Review M2. `input.chainId === 8453 ? "Base" : "Base Sepolia"` labels **any** non-mainnet id as "Base Sepolia" — misleading on a transparency receipt for a misconfigured/unknown chain. Fix: match `base.id` / `baseSepolia.id` explicitly from `wagmi/chains` and surface "Unknown" for anything else. Cheap and unambiguous; bundled here only because it shares the mainnet-readiness theme with E6.1. |

> Fixed & green this session (no action): review H1 (ESLint `set-state-in-effect` error in `useReceipt`), H2 (`PizzaTracker` keyboard/touch a11y for fee detail), H3 (`ReceiptSkeleton` `role="status"`/`aria-live`), M4 (gross-side fee-split invariant guard in `verify.ts` + `decodeReceipt.ts`) and M1 (`verifyDonation` throw-surface JSDoc). Full suite 755/755, `tsc --noEmit` + ESLint clean, `next build` passing. Remaining review MEDIUM/LOW items (M3 `formatUnits` precision, M5 server `notFound()` for malformed txid, M6 `React.cache()` dedup, function-length, magic-number LOWs) left as optional polish in the [review doc](.claude/reviews/epic-6-receipt-review.md).
