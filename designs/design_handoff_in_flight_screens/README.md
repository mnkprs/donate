# Handoff: In-flight donation screens (Epic 5)

> **Three new screens for the Eudaimonia MVP donation funnel**: live processing, failure, and session resume.
> Branch suggestion: `epic-5-receipt-flow` (continues the Epic-4 lineage in `prompts/`).

---

## Overview

The MVP today has a landing page (Epic 1), a checkout form (Epic 2), an on-ramp backend (Epic 3), and a router contract (Epic 4). It's missing the **three screens between checkout-submit and the final public receipt** (Epic 6, separate). This package designs those three.

| # | Screen | Route (recommended) | Triggered by |
|---|---|---|---|
| 1 | **Live processing** | `/processing/[sessionId]` | Stripe Crypto Onramp `success_url` redirect after card auth |
| 2 | **Failure / interrupted** | `/processing/[sessionId]` (same route, different state) | Webhook `failed` event, KYC failure, on-chain revert |
| 3 | **Session resume** | `/status/[sessionId]` | Email "check status" link from the resend-receipt flow |

The processing and failure screens share a route because they're the same surface in different states — the live tracker simply renders one stage as `failed` instead of `active`. The resume screen is a distinct, calmer entry point.

---

## About the design files

The files in `designs/` are **HTML + JSX prototypes built outside the codebase** as the design reference. They are *not* meant to be copy-pasted into `src/`. Your job is to **recreate them as Next.js + React components inside the existing `donate/src/` codebase**, using the patterns already established by the receipt page (`src/components/receipt/`) and the checkout page (`src/components/checkout/`).

Specifically:
- Inline `style={{…}}` objects in the prototypes ⟶ should become Tailwind utility classes keyed off `@theme` tokens in `src/app/globals.css`, matching how `PizzaTracker.tsx` is written (which leans inline). Either approach is acceptable — match the receipt page's mix.
- The prototype's standalone `colors_and_type.css` is a mirror of the design system. The codebase already has the same tokens defined in `src/app/globals.css` and `src/lib/tokens.ts` — **use those**, don't re-import the CSS.
- The prototype uses React via UMD + Babel-in-browser. Ignore that; use the codebase's existing Next.js 16 / TypeScript setup.
- Prototype atoms (`Wordmark`, `PhiMark`, `Mono`, `Num`, `EyebrowLabel`, `VerifyLink`, `CopyButton`, `PillButton`) already exist in `src/components/{brand,ui}/`. Reuse those — don't duplicate.

## Fidelity

**Hi-fi.** All copy, numbers, hex values, paddings, font sizes, and interaction states are production-final. Recreate them pixel-faithfully using the existing Tailwind + design-token setup.

---

## How to view the designs locally

```bash
cd design_handoff_in_flight_screens/designs
# Serve over HTTP (Babel-in-browser refuses file:// for CORS reasons):
python3 -m http.server 8000
# Then open http://localhost:8000/index.html
```

Use the **Tweaks panel** (bottom-right corner) to scrub through every state:
- Processing screen: scrub tracker stage **1–5**
- Failure screen: switch between **card_declined / kyc_failed / onchain_revert / network_timeout**
- Resume screen: flip between **settling / settled / failed**

---

# Screen 1 — Live processing

**Route:** `/processing/[sessionId]`
**Purpose:** Donor returns here from Stripe's hosted on-ramp the instant their card auth completes. The page polls `/api/onramp/status/[sessionId]` (already built in Epic 3) and renders a live 5-stage tracker. When stage 5 settles, navigates to `/receipt/[txid]`.

## Layout (top to bottom)

| Section | Desktop padding | Mobile padding | Notes |
|---|---|---|---|
| Hero (centered) | `96px 64px 56px` | `64px 24px 32px` | Atmospheric gradient mesh, top nav, live status pill |
| Tracker | `24px 64px 64px` | `8px 24px 32px` | 5-column grid on desktop, vertical timeline on mobile |
| "Stay informed" cream card | `0 64px 56px` | `0 24px 32px` | Cream `#f5e9d4` band promoting email-resume path |
| Skeleton receipt preview | `0 64px 88px` | `0 24px 56px` | Greyed-out version of the eventual receipt verification card |
| Footer | `24px 64px 56px` | `16px 24px 40px` | Minimal — wordmark + 2 links |

Max width: `1240px`, centered.

## Hero

- **Nav (absolute, top):** `<Wordmark size={15}>` left; right side has a frosted-glass pill `rgba(255,255,255,0.7)` + `backdrop-filter: blur(6px)` containing a pulsing 5×5px iris dot + the text "Settling on Base".
- **Eyebrow pill (above headline):** `In progress · Step {currentStage} of 5`, all-caps, 10px, letter-spacing `0.12em`, iris-press color `#2e2b8c`.
- **Headline (display-xl, 48px desktop / 30px mobile):** `Your ${amount} is on its way to {charityName}.` The charity name gets the brand's highlight-iris underline (`background-image: linear-gradient(transparent 68%, rgba(83,58,253,0.18) 68%, rgba(83,58,253,0.18) 92%, transparent 92%)`).
- **Subheader row:** `Started 5:34:01 PM UTC · May 21, 2026  ·  Usually 6–12 seconds  ·  You can close this tab`, separated by 3×3 steel dots. Use `tnum` figures.
- **Charity anchor chip** (`marginTop: 40px` desktop / 24px mobile): the same frosted pill as on the receipt page hero — `<CharityAvatar initials="PC" size={28} />` + name + `EIN 95-4374797 · 501(c)(3)`.

## The live tracker — central mechanic

5 stages. Each stage has one of four **states**:

| State | Node visual | Card | Copy |
|---|---|---|---|
| `done` | Filled iris circle (`#533afd`) with white checkmark inside | White card, hairline border, full content, "Verify ↗" link enabled | Real timestamp + amount |
| `active` | White circle, iris stroke, pulsing iris ring (CSS `@keyframes`) | White card, lifted shadow `var(--shadow-2)`, "Pending… +Ns" counter live | Live ticker for elapsed seconds |
| `queued` | White circle, dashed steel border, **stage number** centered inside | Transparent card, dashed border, italic "Waits for the previous step to settle on-chain." | No amount, no address |
| `failed` | Filled urgent circle (`#c14040`) with white × inside | White card, `#f4cfcf` urgent-tinted border, inline red error strip below content | Failure reason from webhook |

### The 5 stages (in order)

```ts
const LIVE_STAGES = [
  { n: 1, key: 'paid',       title: 'Paid',       short: 'Card charged · Stripe',
    addressLabel: 'Charge ID',  contract: 'Stripe Payments' },
  { n: 2, key: 'converted',  title: 'Converted',  short: 'USD → USDC via Stripe Onramp',
    addressLabel: 'Settle to',  contract: 'Stripe Crypto Onramp' },
  { n: 3, key: 'routed',     title: 'Routed',     short: 'Eudaimonia · 1% fee taken on-chain',
    addressLabel: 'Router',     contract: 'TransparentDonationRouter' },
  { n: 4, key: 'delivered',  title: 'Delivered',  short: "Arrived at charity's Endaoment fund",
    addressLabel: 'Charity',    contract: 'Endaoment · OrgFund' },
  { n: 5, key: 'published',  title: 'Published',  short: 'Public receipt live · sharable forever',
    addressLabel: 'Receipt URL', contract: 'eudaimonia.app' },
];
```

### Tracker layout

**Desktop:** `display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;` with an absolutely-positioned 1px hairline connecting line at `top: 18px` (the vertical center of the 36px nodes). A second iris-colored line overlays it from stage 1 up to the current active/last-done stage — this is the "progress fill".

**Mobile:** `display: grid; grid-template-columns: 36px 1fr; gap: 14px;` per row. Each row has its node on the left, a 1px vertical rail dropping down to the next node (iris if upstream is done, dashed steel if queued), and the card on the right.

### Webhook state machine

The tracker stage maps directly to events from `src/lib/onramp/webhook-handler.ts`:

| Webhook event | currentStage | Notes |
|---|---|---|
| (none yet — fresh redirect) | 1 (active) | Card was just charged, on-ramp not yet pinged |
| `crypto_onramp_session.created` | 2 (active) | Stripe ack'd, conversion starting |
| `crypto_onramp_session.pending` | 2 (active) | Still converting; show pulsing |
| `crypto_onramp_session.fulfilled` + USDC arrived | 3 (active) | USDC settled on Base; router call is next |
| `DonationRouted` event from router contract | 4 (active) | Router took 1% and forwarded; Endaoment delivery is next |
| `Donation` event from Endaoment OrgFund | 5 (active) | Funds reached charity; receipt is being written |
| Receipt page is up at `/receipt/[txid]` | (navigate away) | Auto-redirect when stage 5 settles |

Poll `/api/onramp/status/[sessionId]` every 2s while not terminal. Use `useSWR` or the codebase's existing pattern — there's no fetch helper in `src/lib/` yet, so introduce one.

## "Stay informed" cream card

- Background `var(--color-canvas-cream)` (`#f5e9d4`), radius 12, padding 28 desktop / 22 mobile.
- Eyebrow `If you have to go`.
- Heading `We'll email you the receipt when it's ready.`
- Body: `Closing this tab won't cancel the donation. The receipt finishes settling on-chain either way. We'll send it to <strong>{donorEmail}</strong>.` (Email is masked: `m***@protonmail.com`)
- Buttons: ghost `Resend link` + dark `Got it`.

## Skeleton receipt preview

3-column card grid mirroring the eventual receipt's `VerificationCard`:
- Column 1 (TX hash): pulsing `var(--color-hairline-soft)` skeleton bar, label "Receipt URL appears once published".
- Column 2 (Block): pulsing skeleton, label "Awaiting confirmations".
- Column 3 (Network): real `<BaseMark />` + "Base · Ethereum L2" (no skeleton — we know this already).

Skeleton pulse: `@keyframes euda-skel { 0%,100% { opacity: 0.55 } 50% { opacity: 1 } }`, `animation: euda-skel 1.6s ease-in-out infinite`.

Below it on desktop: the fee-disclosure strip identical to the receipt page's, but with pre-settlement language: `Donor paid $5.00 · Eudaimonia fee $0.05 (1%) · Endaoment fee $0.07 (1.5%) · Charity will receive $4.876`.

---

# Screen 2 — Failure / interrupted

**Same route as processing**, just rendered when the session state is `failed`. The visual relationship between the two screens is intentional: same tracker, same skeleton structure — the donor should *see* that nothing was hidden from them, the system simply paused at a specific stage.

## Hero

- Nav: same as processing, but the right-side pill is `rgba(255,255,255,0.7)` + `1px solid #f4cfcf` (urgent-tinted) + 5×5 urgent dot + the outcome label.
- Eyebrow pill: `Interrupted at step {failedAt} of 5`, urgent color.
- Headline: `Your ${amount} to {charityName} {outcomeHeroLead}.` — the verb changes per outcome (see table below).
- One-line subhead in `var(--color-ink-secondary)` explaining what happened.
- **Two CTAs side by side**: primary iris pill (outcome-specific) + ghost secondary.

## The four outcomes

These map 1:1 to error states in the existing webhook handler and the eventual router-error decoder. Use `outcome: 'card_declined' | 'kyc_failed' | 'onchain_revert' | 'network_timeout'` as the screen's primary prop.

| Outcome | Failed at stage | Hero lead | Money status copy | Refund? | Diagnostic line |
|---|---|---|---|---|---|
| `card_declined` | 1 | `wasn't charged` | "Nothing has moved. Your account was not charged." | No (auth never completed) | `Stripe error: card_declined · decline_code: do_not_honor` |
| `kyc_failed` | 2 | `is paused` | "Your card was charged. A refund is on its way back automatically." | Yes (auto, 5–7 days) | `Stripe event: crypto_onramp_session.failed · reason: kyc_required` |
| `onchain_revert` | 3 | `is being refunded` | "Your USDC is being returned to the on-ramp. The fiat refund follows automatically." | Yes (auto, on-chain) | `Tx 0xd9c1…4f8a · reverted at OrgFundFactory.donate · gas used 84,213` |
| `network_timeout` | 2 | `is still pending` | "The on-chain side may still complete on its own. We're monitoring." | Maybe | `Last event: crypto_onramp_session.created · 47s ago` |

Each outcome also has its own primary CTA and secondary CTA — see `screens/screen-failure.jsx::FAILURE_OUTCOMES` for the exact copy strings; treat that file as the source of truth.

## "Where your money is" card (the most important card on the page)

- 2-column grid on desktop (`1fr 1fr`), single-column on mobile.
- **Left column:** eyebrow `Where your money is`, heading uses the outcome's `moneyStatus` copy verbatim, body uses `moneySubcopy`. If `refundCopy` is set, render a pulsing iris pill below body containing that text.
- **Right column:** small "Receipt summary" mini-table on `var(--color-canvas-soft)` background — 4 rows (`Attempted`, `Charity`, `Started`, `Stopped at`) using `tnum`.

## Failure tracker

Identical to the processing tracker, except the `failedAt` stage gets state `failed` and a red error strip below its content area containing the outcome's `stageReason`. Stages above `failedAt` show `done`; stages below show `queued`.

## Diagnostic card (dark)

- Background `var(--color-ink)` (`#0d253d`), white text.
- Eyebrow at `rgba(255,255,255,0.5)`: "For the curious".
- Heading "Diagnostic".
- Body: "The raw event from our pipeline. If you contact support, paste this — it tells us exactly what happened without any back-and-forth."
- A monospace pill with the raw diagnostic line + a copy button. Use `var(--font-mono)`.

## Help strip

Above-fold horizontal rule strip: `Need a human?` heading + body referencing the session ID (`<Mono>`), then ghost `Email support` + outline `Read FAQ` buttons.

---

# Screen 3 — Session resume

**Route:** `/status/[sessionId]`
**Purpose:** Donor clicks the "check status" link in the email we sent them and lands here. Three possible states the page must handle on mount based on `/api/onramp/status/[sessionId]`.

## Three states

| Status | Pill label | Headline | Subtitle | Primary CTA | Secondary CTA |
|---|---|---|---|---|---|
| `settling` | "In progress" (pulsing iris) | "Your donation is still on its way." | "You can leave again — we keep going either way. The receipt page will publish itself when the on-chain settlement clears." | Refresh status | Email me when done |
| `settled` | "Done · final" (solid iris) | "Your receipt is live." | "All five stages settled on-chain. The page is public and infinitely shareable." | Open receipt | Copy link |
| `failed` | "Needs attention" (solid urgent) | "Your donation didn't complete." | "A step on the route was interrupted. No funds are stuck — a refund is in motion, or you can retry now." | See what happened | Email support |

## Sections

1. **Hero** — softer gradient mesh than processing (opacity 0.85), eyebrow pill (status-tinted), headline, subhead. No big imagery; this is a calm status check.
2. **Session summary row** — single white card with `CharityAvatar` + name on the left, then `Amount / Started / Receipt (or Status)` cells, then the two CTAs on the right. Mobile collapses to a stacked layout.
3. **Compact tracker** — the same `LiveTrackerHorizontal` / `Vertical` from screen 1, with state set per status: `settling` shows current stage active; `settled` shows all done; `failed` shows the failed stage.
4. **Settled receipt callout** (settled only) — large dark `var(--color-ink)` card with the receipt URL in monospace + copy button + big iris "Open receipt" CTA. Radius 16, padding 40 desktop.
5. **Notify card** (settling/failed only) — cream card promoting email follow-up. Same pattern as the processing screen's "stay informed" card.
6. **Minimal footer** — wordmark + 2 links.

---

# Shared atoms (already in codebase)

Reuse these existing components — do **not** duplicate the implementations from the prototype's `atoms.jsx`:

| Prototype name | Existing codebase path |
|---|---|
| `<Wordmark>`, `<PhiMark>` | `src/components/brand/{Wordmark,PhiMark}.tsx` |
| `<Mono>`, `<Num>` | `src/components/ui/{Mono,Num}.tsx` |
| `<EyebrowLabel>` | `src/components/ui/EyebrowLabel.tsx` |
| `<VerifyLink>` | `src/components/ui/VerifyLink.tsx` |
| `<CopyButton>` (called `CopyChip` in prototype) | `src/components/ui/CopyButton.tsx` |
| `<PillButton>` | `src/components/ui/PillButton.tsx` (variants: `primary | dark | ghost | outline`) |
| Striped placeholder | `src/components/ui/StripedPlaceholder.tsx` |

New components to add (these don't exist yet):
- `src/components/receipt/LiveTracker.tsx` — extracts from the existing `PizzaTracker.tsx` but adds the `'active' | 'queued' | 'failed'` states alongside the existing `'done' | 'inactive'`. Consider unifying both into one component.
- `src/components/brand/CharityAvatar.tsx` — the gradient-fill initial chip used in hero anchors.
- `src/components/brand/BaseMark.tsx` — the blue Coinbase Base network mark.
- `src/components/brand/GradientMesh.tsx` — the atmospheric backdrop blob composition.

---

# Design tokens used

All of these are already defined in `src/app/globals.css` (`@theme` block) and mirrored in `src/lib/tokens.ts`. **Do not redefine them.**

### Colors (used by these screens)

```css
--color-iris:           #533afd  /* primary CTA, active stage, pulsing ring */
--color-iris-press:     #2e2b8c  /* eyebrow text on iris-bg pills */
--color-iris-bg:        #eef0fe  /* status pill bg */
--color-ink:            #0d253d  /* body text, dark cards */
--color-ink-dark:       #1c1e54  /* charity-avatar gradient stop */
--color-ink-secondary:  #273951  /* body copy on cream/light cards */
--color-ink-mute:       #56627a  /* helper/caption text */
--color-on-primary:     #ffffff  /* text on iris/ink surfaces */
--color-canvas:         #ffffff  /* default bg */
--color-canvas-soft:    #f6f9fc  /* skeleton bg, receipt summary card */
--color-canvas-cream:   #f5e9d4  /* "stay informed", "notify" cards */
--color-hairline:       #e3e8ee  /* 1px card borders */
--color-hairline-soft:  #eef2f6  /* queued/inactive card borders */
--color-steel:          #a8c3de  /* dashed borders, separator dots */
--color-urgent:         #c14040  /* failure node fill, error text */
                                 /* failure borders use #f4cfcf (lighter urgent) */
```

### Type
- Display headlines: `Inter` weight 300, letter-spacing `-0.96px` at 48px, `-0.6px` at 30px.
- Body: 14–15px Inter 300.
- Mono (TX hashes, addresses, diagnostics, session IDs): `JetBrains Mono` weight 400, `font-feature-settings: "tnum","ss01"`, letter-spacing `-0.2px`.
- Eyebrow: 10px, weight 400, `letter-spacing: 0.12em`, `text-transform: uppercase`, color `var(--color-ink-mute)`.

### Spacing
8px base + 2/4/12 sub-tokens: `--space-{xxs|xs|sm|md|lg|xl|xxl|huge}` = 2/4/8/12/16/24/32/64.

### Radius
`var(--radius-{sm|md|lg|xl|2xl|pill})` = 6/8/12/16/20/9999.

### Shadow
`var(--shadow-{1|2|hi})` — all toned with `rgba(0,55,112,…)`, never black.

---

# Animations

All defined inline in `tracker-live.jsx::TrackerStyles`:

```css
@keyframes euda-pulse {
  0%   { transform: scale(1);   opacity: 0.5; }
  70%  { transform: scale(1.6); opacity: 0;   }
  100% { transform: scale(1.6); opacity: 0;   }
}
@keyframes euda-dot-pulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(83,58,253,0.20); }
  50%      { box-shadow: 0 0 0 5px rgba(83,58,253,0.06); }
}
@keyframes euda-skel {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}
```

- `euda-pulse` is the expanding ring on the active stage node (1.6s ease-out infinite).
- `euda-dot-pulse` is the soft glow on small status-pill dots (1.2s ease-in-out infinite).
- `euda-skel` is the skeleton shimmer (1.6s ease-in-out infinite).

No bounce, no spring, no parallax — those break the brand. The only motion outside of these is `transition: all .15s` on hover.

---

# State management

### Processing screen
- One `useEffect` polls `/api/onramp/status/[sessionId]` every 2 seconds.
- The response is the existing `OnrampSession` type from `src/types/onramp.ts`. Extend its `status` enum (or add a separate `stage` field) to capture the 5 stages above.
- On status `settled` with a known `txHash`, `router.replace('/receipt/' + txHash)` — the donor should never see the published-stage card; they should land directly on the receipt.
- On status `failed`, render the same page with `outcome` derived from `session.failureReason`.

### Failure screen
- Reads the same `OnrampSession`. The `failureReason` field discriminates the four outcomes.
- Primary CTA on `card_declined` → router.push back to `/donate/[campaignId]`.
- Primary CTA on `kyc_failed` → restart the Stripe session (`POST /api/onramp/session` again).
- Primary CTA on `onchain_revert` → router.push to `/` (campaign picker — the original charity might still be paused).
- Primary CTA on `network_timeout` → re-fetch status; if still no result, escalate.

### Resume screen
- Single fetch on mount; renders one of three states.
- If `settling`, render with a manual "Refresh status" button; **do not auto-poll** here — the donor arrived from an email link and might re-open this hours later. Polling would be wasteful.

---

# Open questions for the implementer

1. **Receipt-stage-5 timing.** When does the receipt page actually publish? We treat "Published" as a distinct on-chain hop, but in reality it's just a frontend rendering. Either (a) skip stage 5 and call stage 4 the terminal stage; or (b) keep it as a meaningful step that signals "your receipt's URL is now stable and shareable". The design assumes (b) — confirm with the team.
2. **Email "check status" link.** Out of scope for this handoff, but it's the trigger for screen 3. Plumb a `/status/[sessionId]` link into the existing email template once the email infra lands.
3. **Polling vs. SSE.** The webhook handler is server-side; the client polls. Consider an SSE/WS upgrade later for a smoother live-tracker feel. For MVP, polling is fine.

---

# Files in this handoff

| File | Purpose |
|---|---|
| `designs/index.html` | Entry — open this in a browser to view all 3 screens on the design canvas |
| `designs/atoms.jsx` | Shared brand atoms (Wordmark, PhiMark, Mono, etc.) — **reference only**, codebase has its own |
| `designs/tracker-live.jsx` | The 5-stage live tracker (`LiveTrackerHorizontal`, `LiveTrackerVertical`, `buildLiveStages`, `STAGES_TEMPLATE`) |
| `designs/screen-processing.jsx` | Live processing screen layout |
| `designs/screen-failure.jsx` | Failure screen + `FAILURE_OUTCOMES` lookup (source of truth for outcome copy) |
| `designs/screen-resume.jsx` | Session resume screen + `RESUME_STATUS` lookup |
| `designs/colors_and_type.css` | Design system tokens — already mirrored in `src/app/globals.css`, don't import this |
| `designs/design-canvas.jsx` | Canvas wrapper for displaying multiple artboards — not needed in production |
| `designs/tweaks-panel.jsx` | Tweaks UI for previewing states — not needed in production |
| `designs/assets/` | SVG marks (phi, base, usdc) — codebase already has these in `public/` |

---

# Suggested implementation order

1. **Day 1: Extract `LiveTracker`.** Refactor `PizzaTracker.tsx` to also handle `'active' | 'queued' | 'failed'` states. Get one new state into Storybook (or just a route stub).
2. **Day 2: Build the processing screen** behind a feature flag, wired to a mock session that scrubs through the 5 stages on a timer. This lets you nail the tracker before plumbing real webhooks.
3. **Day 3: Build the failure screen** using the same tracker. Hardcode the four outcomes from `FAILURE_OUTCOMES`.
4. **Day 4: Wire to real `/api/onramp/status/[sessionId]`.** Extend the webhook handler to record `currentStage` on each event.
5. **Day 5: Build the resume screen.** Smaller; reuses everything.
6. **Day 6: E2E tests.** Mock the four failure paths; mock the happy path through all 5 stages. The existing Playwright setup in `e2e/onramp.spec.ts` is the template.

---

*Generated 22 May 2026 by the design tool. Questions or changes — open an issue on `mnkprs/Philotimo` and tag it `epic-5-design-handoff`.*
