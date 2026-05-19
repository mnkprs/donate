# ADR 0001 — On-Ramp Provider: Stripe Crypto Onramp

- **Status:** Accepted
- **Date:** 2026-05-19
- **Epic:** [#4 — Epic 3 Fiat-to-crypto on-ramp integration](https://github.com/<org>/donate/issues/4)
- **Resolves:** Open Question #1 in `ARCHITECTURE.md` — "How will the fiat on-ramp dynamically pass the unique user session / selected charity destination straight into our smart contract function upon a successful credit card swipe?"

---

## Context

Philotimo routes fiat donations to charity through a custom Solidity router on Base. The user pays USD with a card, the on-ramp mints USDC on Base into our router contract, and the router splits the funds between our treasury (1%) and the Endaoment charity contract (99%). The on-ramp must:

1. Accept the donor's card and KYC at the provider edge so Philotimo never touches PAN/PCI data.
2. Deliver USDC to a destination address we control (the router) on Base mainnet (Base Sepolia in sandbox).
3. Carry an opaque per-donation identifier (campaign id + Endaoment org id) all the way through the funding leg so the router can post-process the donation deterministically.
4. Expose a webhook so our backend can record `sessionId → expectedTxHash` for receipt-page resolution.
5. Run end-to-end against a sandbox today, with Base Sepolia.

The two providers in scope were **Stripe Crypto Onramp** and **MoonPay**.

## Decision

**Adopt Stripe Crypto Onramp** as the fiat-to-crypto provider for Philotimo's MVP.

The donation flow becomes:

```
Browser ── POST /api/onramp/create ──► Stripe Crypto Onramp session
                                           │
                                           ▼ (donor completes payment)
                                       USDC minted on Base
                                           │
                                           ▼ (destination = TransparentDonationRouter)
                                       Router contract
                                           │
                                           ├── 1% → Treasury
                                           └── 99% → Endaoment charity contract
                                           │
                                           ▼ (success event)
                                       POST /api/onramp/webhook ── writes sessionId → txHash mapping
```

## Rationale

| Criterion | Stripe Crypto Onramp | MoonPay |
| --- | --- | --- |
| Base + USDC native support | Yes — first-class `destination_network: "base"`, `destination_currency: "usdc"` | Supported but via generic currency params; Base added later than Stripe |
| Destination-wallet enforcement | Yes — `wallet_address` is a session parameter the donor cannot edit | Wallet locking exists but historically weaker UX defaults |
| Per-session metadata pass-through | Yes — `metadata` is a free-form map readable in webhooks | `externalCustomerId` + `externalTransactionId` only, with stricter formatting |
| Webhook ergonomics | Yes — `stripe.webhooks.constructEvent` HMAC verify mirrors existing Stripe libraries | Custom signature header + raw-body handling, separate SDK |
| Sandbox parity | Yes — Stripe test mode is a single env-var flip; CLI replay (`stripe trigger`) reproduces production payloads | Sandbox is a separate domain and account |
| Aesthetic fit | Yes — `DESIGN.md` already mirrors Stripe's design system; the donor-facing widget feels native | MoonPay's branded widget is harder to white-label cleanly |
| Pricing | Similar — ~1% network + ~3% card fees, both deducted at processor | Similar — slightly higher card fees in some regions |
| Geographic coverage | Covers US/EU/UK/most of LATAM and APAC. Sufficient for MVP. | Broader global card coverage, including more EMEA + Africa |

The only criterion MoonPay clearly wins is geographic breadth. For an MVP that targets US/EU donors, the SDK, webhook, and metadata advantages of Stripe outweigh that.

## Consequences

- **Positive:**
  - `metadata: { campaignId, endaomentOrgId }` answers Open Question #1 cleanly — the Endaoment routing target rides inside the Stripe session and is readable both in our webhook and (when we later wire it) by the router contract via off-chain signed attestation.
  - Single-vendor surface: same Stripe key shape we already understand; one SDK to keep current.
  - Test mode + Stripe CLI gives us deterministic webhook replay for the idempotency tests Epic 3 requires.
- **Negative:**
  - Donor base limited to Stripe-supported regions. We accept this for MVP.
  - Locked to Stripe's roadmap for new chain/asset support. Mitigation: keep the provider behind a thin internal interface (`src/lib/onramp/stripeClient.ts`) so a second provider can be added without touching the route handlers.
- **Operational:**
  - We must hold a Stripe Crypto Onramp account in good standing and complete their attestation/compliance steps before launch. The sandbox does not require this.
  - Webhook secret rotation must be a documented runbook step (out of scope for Epic 3, tracked separately).

## Alternatives considered

- **MoonPay** — rejected above on SDK/webhook/metadata ergonomics for an MVP that doesn't need their geographic breadth yet.
- **Self-hosted DEX swap (e.g. fund the router from a permissioned LP)** — rejected. PCI/KYC obligations are non-trivial; provider-managed fiat onboarding is what makes a charity on-ramp viable at our team size.
- **Defer the on-ramp; ship a "connect wallet → donate USDC" flow first** — rejected. Project goal is *fiat-in*, not wallet-onboarding; that flow excludes ~95% of our intended donor base.

## Follow-ups

- Track a future revisit point in the issue tracker once donor geographic mix is known; if EMEA/Africa demand emerges, add MoonPay as a second provider behind the same internal interface.
- Add `docs/adr/0002-fees-on-chain.md` to capture the related fee-collection-point decision.
- During Phase 1 of the Epic 3 plan, verify the exact `stripe.crypto.onrampSessions.create` parameter shape against the pinned SDK version before writing the mock-shape tests (see plan risks).
