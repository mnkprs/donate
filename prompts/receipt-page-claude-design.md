# Claude Design prompt — Eudaimonia receipt page (MVP wedge)

**Companion files to attach as ground truth:** `DESIGN.md` (visual system, Stripe-derived), `PRODUCT.md` (Eudaimonia MVP — the wedge: a public, shareable on-chain donation receipt at `eudaimonia.app/receipt/{txid}`).
x§
## Product context

**Eudaimonia** (Greek *φιλότιμο* — "love of honor", the sense of duty to do right by others) is a transparent on-chain donation platform on Base L2. The MVP wedge is a single page: the public donation receipt for any Endaoment donation routed through Eudaimonia. The page is unauthenticated, infinitely shareable, and works for any historical transaction.

## What to design

A **single page** at `eudaimonia.app/receipt/{txid}`. The hero mechanic is a **"Pizza Tracker" timeline** that turns a hex transaction hash into a story of where the money went.

Design for **desktop (1440)** and **mobile (390)**. Also produce the **Open Graph share image (1200×630)** that renders when the URL is pasted into iMessage / Twitter / WhatsApp.

## Honesty note (read first)

The receipt above is a **vanilla Endaoment donation** rendered by Eudaimonia. Eudaimonia does not yet route donations through its own smart contract, so there is **no Eudaimonia platform fee in this transaction**. The tracker still shows a 5th stage for the platform fee, but it must render as **future / not-yet-active** with honest copy (see Pizza Tracker section). Do not show a fake Eudaimonia fee that doesn't exist on-chain — the entire product value is verifiability.

## Real data to render (use this exact donation)

- **Donor:** `0xe0adb1…7a097bb` (no ENS resolved)
- **Charity:** Black Women in Blockchain Inc · EIN 87-1055621
- **Amount:** $1.00 (settled as 1.001017 USDC)
- **Date:** May 30, 2025 · 5:34 PM UTC
- **Network:** Base
- **TxID:** `0xdc671195100031cab810c6c9ad6da7a1e43212f2bb3b0d9c0ece38ac0e7a78ed`
- **Block:** 30,918,548 · **Confirmations:** 15M+ (final)
- **Donor paid in:** ETH (`0.0000627…` ETH), swapped via Uniswap V3
- **Endaoment fee:** 1.5% (`$0.015`, taken on-chain to `0x5e8e…3b14`)
- **Eudaimonia fee:** not yet active — shown as future stage

## Page sections, top to bottom

1. **Hero (centered, generous whitespace).** Small Eudaimonia wordmark anchored top-left. One sentence in a large display weight: "Anonymous donor gave **$1.00** to **Black Women in Blockchain Inc**." Below it, one line of light meta text: "May 30, 2025 · Settled on Base · Verified on-chain." A small charity logo (placeholder slot) anchors the recipient.

2. **The Pizza Tracker (the differentiator — make this beautiful).** A horizontal 5-stage tracker on desktop, vertical on mobile. Each *active* stage is a stop on the path the money took, with timestamp and a "verify ↗" link to BaseScan. Stage 4 is **special**: it represents Eudaimonia's future role and must render as visibly inactive (greyed dot, lighter text, no checkmark, no verify link) — never as a fake complete step.

   - **1. Donated** ✓ active — donor wallet sent funds (`0xe0ad…7bb`)
   - **2. Converted** ✓ active — ETH → USDC via Uniswap V3 (rate shown)
   - **3. Routed** ✓ active — passed through Endaoment's OrgFundFactory (`0x10fd…a589`), 1.5% Endaoment fee shown honestly on hover
   - **4. Eudaimonia fee** ⏳ **inactive / future** — copy reads: *"Future Eudaimonia donations will route through our 1% platform fee here. This receipt is for an existing Endaoment donation, so no Eudaimonia fee was charged."* Render as dimmed/dashed, distinctly visually different from active stages. No verify link.
   - **5. Settled** ✓ active — USDC arrived at charity's on-chain address (`0x10e9…eb82`) with 15M+ confirmations

   Stages 1, 2, 3, 5 are complete; this is a *replay*, not a live tracker. Use a calm checkmark or filled dot, not aggressive green. Each active stage has a subtle hover state revealing the relevant log + amount. Use the brand accent (Indigo `#533afd` per DESIGN.md) for the active accent color, not generic success-green. The visual contrast between the 4 active stages and the 1 inactive future stage is the **honesty signal** — donors should *feel* that Eudaimonia doesn't pretend to be more than it is yet.

3. **Charity card.** Surface block with: charity name, EIN, one-line mission (placeholder), "Visit charity →" link. Stripe-style soft shadow, ample padding.

4. **Verification card.** Three small data cells in a row: full TxID (monospaced, copy button), block number, network logo. Compact, not flashy. This is for the skeptical user who wants proof, not narrative.

5. **Share row.** "Share this receipt" with three buttons: Copy link, Twitter, WhatsApp. No social vanity counts.

6. **Footer.** Minimal: "What is Eudaimonia?" link → short explainer. No promo CTA. The wedge is the receipt itself; we are not selling anything on this page.

## States to include

- **Default** (what's above)
- **Invalid TxID** (`/receipt/0xnothing`) — calm empty state, not error-shouty
- **Loading** (skeleton of the tracker, no spinners) — should look intentional, not blank

## Tone & don'ts

- **Tone:** Stripe meets a museum wall label. Confidence, not crypto-bro hype. Quiet dignity — that's the Eudaimonia voice. No animated gradients, no glowing borders, no rocket emojis.
- **Don't** use generic card grids with uniform padding. Use editorial hierarchy.
- **Don't** default to dark mode. Light surfaces with disciplined contrast per DESIGN.md.
- **Don't** invent custom crypto/hacker iconography. Tx hashes are the only "crypto" element; everything else is restrained.
- **Do** use Sohne (or Inter fallback) at weight 300 with negative tracking on display sizes, per DESIGN.md.
- **Do** use tabular figures (`tnum`) on every money/numeric value.

## Why this matters

This single page is the entire Eudaimonia MVP. If it's beautiful enough that one donor screenshots and shares it, the wedge thesis is proven. Treat it like a hero landing page, not a utility receipt.
