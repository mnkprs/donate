# Epic 2 — Stripe-style Fiat Checkout — TDD Port Plan

## Context

Epic 2 (GitHub issue #3, OPEN) requires porting the static checkout design at
`designs/checkout.jsx` + `designs/Checkout Page.html` into a live Next.js route
at `src/app/donate/[campaignId]/page.tsx`. The page is the donor's entry into
the funnel: a campaign summary, amount entry (preset chips + custom value),
email capture, optional note, transparent order summary with 1% platform fee,
and a CTA that hands off to the on-ramp (Epic 3).

This PR ships the **UI + form state + validation** layer. The real on-ramp
submission lives in Epic 3 and is wired through a typed callback interface so
this PR is testable, ship-grade, and gracefully degrades until Epic 3 lands.

This continues the pattern established by the Epic 1 landing-page port
(commit `6692030`): modular components in `src/components/<feature>/`,
SSR-tested via `renderToString` + substring assertions, Tailwind utilities
keyed off the `@theme` tokens already in `src/app/globals.css`, no React
Testing Library, no inline styles in the ported components.

## Decisions Locked In

| Question | Decision |
|---|---|
| Submit handoff (Epic 3 not built) | Typed `onSubmit` prop with stub action that throws a known "not wired" error. CheckoutForm fully renders + validates; the form's submitting/error states are exercised by tests. |
| Validation library | Hand-rolled in `src/lib/checkout/validation.ts` (pure functions). No new dependency. |
| Processing UI scope | SummarySkeleton + aria-busy + disabled CTA for now. The 4-stage `ProcessingStrip` animation deferred to Epic 3 PR where stages map to real webhook events. |

## Target Architecture

```
src/app/donate/[campaignId]/
├── page.tsx                    server component → resolves campaign or notFound()
└── page.test.tsx               unit: route renders campaign / 404s on bad id

src/components/checkout/
├── CheckoutForm.tsx            "use client" — owns form state, orchestrates
├── CheckoutForm.test.tsx
├── CampaignSummary.tsx         campaign badge + mission + tag (top of page)
├── CampaignSummary.test.tsx
├── AmountSelector.tsx          preset chips (25/50/100) + custom input
├── AmountSelector.test.tsx
├── DonorDetails.tsx            email + optional note textarea
├── DonorDetails.test.tsx
├── OrderSummary.tsx            gross → fees → net breakdown + skeleton state
├── OrderSummary.test.tsx
└── CheckoutMesh.tsx            decorative radial-gradient backdrop (no test)

src/components/ui/              (new small atoms, reused by checkout)
├── AmountChip.tsx              tabular-numeral chip button
├── AmountChip.test.tsx
├── TextInput.tsx               focus-bordered input with prefix/suffix slots
├── TextInput.test.tsx
├── TextArea.tsx                same focus treatment as TextInput
├── TextArea.test.tsx
├── FieldLabel.tsx              <label> with optional hint slot
└── FieldLabel.test.tsx

src/lib/checkout/
├── fees.ts                     pure: calculateBreakdown(grossCents) → rows
├── fees.test.ts
├── validation.ts               pure: validateAmount, validateEmail
├── validation.test.ts
└── stubSubmit.ts               client-side stub passed to CheckoutForm.onSubmit

src/types/checkout.ts           CheckoutPayload, FeeBreakdown, ValidationResult

e2e/checkout.spec.ts            new Playwright spec — covers Epic 2 acceptance
```

## Reusable Pieces (from inventory)

- **Tokens** already in `src/app/globals.css`: `bg-iris`, `bg-iris-hover`, `text-ink`, `text-mute`, `text-steel`, `border-rule`, `border-rule-soft`, `bg-tint`, `bg-cream`, `bg-urgent`. **No new tokens needed.**
- **Existing atoms** in `src/components/ui/`: `PillButton`, `ArrowRight`, `Mono`, `Num`, `EyebrowLabel`, `StripedPlaceholder`. Reuse all six. `PillButton` already supports `variant="primary"` + `disabled` usable for the submit CTA.
- **Campaign data** via `getCampaignById(id)` from `src/lib/campaigns.ts` — returns `Campaign | undefined`, so `notFound()` is a one-liner in the server component.
- **Test harness** — `renderToString` + substring assertions (no React Testing Library), per the established CampaignCard pattern. SSR-encoding quirks already documented in `CampaignCard.test.tsx`.

## Phased TDD Plan

Each phase: RED (write tests, run, watch them fail) → GREEN (minimal impl) → REFACTOR (clean, type-check, full test suite). Commit after each phase.

### Phase 1 — Pure logic: fees + validation (no UI yet)

**Why first:** The fee math is the highest-risk business logic. Lock it down in pure modules where the TDD loop is fastest.

1. `src/types/checkout.ts` — `FeeBreakdown`, `ValidationResult<T>`, `CheckoutPayload`.
2. **RED** `src/lib/checkout/fees.test.ts` — assertions for: gross $25 → 1% Philotimo + Endaoment overhead + card-processing rows, net charity amount; edge cases (gross $0 returns zero rows or empty; rounding to cents; very large amount). Source the row labels and constants from the design (`designs/checkout.jsx` `OrderSummary`).
3. **GREEN** `src/lib/checkout/fees.ts` — `calculateBreakdown(grossCents: number): FeeBreakdown` returning typed rows for rendering.
4. **RED** `src/lib/checkout/validation.test.ts` — amount: < $1 fails, > $10,000 fails (locked-in min/max, configurable), non-numeric fails, valid passes; email: missing fails, malformed fails, valid passes.
5. **GREEN** `src/lib/checkout/validation.ts` — `validateAmount`, `validateEmail`.

**Verify:** `npm run test src/lib/checkout` → green; `npm run typecheck` → green.

### Phase 2 — UI atoms: AmountChip, TextInput, TextArea, FieldLabel

**Why next:** These atoms are reused by every checkout component. Building them first lets later phases compose without inventing on the fly.

For each atom: **RED** `.test.tsx` first, asserting:
- Renders the correct semantic element (`button`, `input`, `textarea`, `label`).
- Props affect rendered output (active state on `AmountChip`, `prefix`/`suffix` slots on `TextInput`, `hint` slot on `FieldLabel`).
- Accessibility hooks present (`aria-pressed` on chip, `aria-invalid` on inputs when invalid, label-input association via `htmlFor`).
- **No inline styles** — assert via class names that Tailwind utilities are used (e.g., `bg-iris`, `border-rule`, `focus:border-iris`).

**GREEN** the atom files. All atoms are pure presentational, no state.

**Verify:** `npm run test src/components/ui` → green.

### Phase 3 — CampaignSummary component

**RED** `CampaignSummary.test.tsx`:
- Renders campaign name, mission, tag pill, EIN.
- Includes "501(c)(3)" + Endaoment attribution text.
- Decorative gradient badge present (assert via class names + the campaign `swatch`/`swatch2` hex values passed as CSS custom properties on a single inline `style` attribute — gradient values can't be Tailwind utilities, this is the one allowed exception, documented in code).
- Renders `<StripedPlaceholder>` as the photo (reusing the existing atom).

**GREEN** `CampaignSummary.tsx` accepting a `campaign: Campaign` prop.

### Phase 4 — AmountSelector

**RED** `AmountSelector.test.tsx`:
- Renders three preset `AmountChip`s with values 25, 50, 100 (constant lives in `src/lib/checkout/fees.ts` or a shared constants module).
- Renders a "Custom" chip that toggles `<TextInput>` visibility.
- Selecting a chip calls the `onChange` callback prop with the new cents value.
- Active chip has `aria-pressed="true"`.
- Custom input strips non-numeric characters and reports cents via `onChange`.
- Validation error message renders below the field when `error` prop is set.

**GREEN** `AmountSelector.tsx` — controlled component, props: `{ valueCents, onChange, error, presets }`.

### Phase 5 — DonorDetails

**RED** `DonorDetails.test.tsx`:
- Email input with `type="email"`, `autoComplete="email"`, label "Email for receipt".
- Optional note textarea (3 rows) hidden by default, revealed by a "Add a note" toggle.
- `onChange` callbacks fire for both fields.
- Email error message renders when `emailError` prop set.

**GREEN** `DonorDetails.tsx`.

### Phase 6 — OrderSummary

**RED** `OrderSummary.test.tsx`:
- Given `breakdown` from `calculateBreakdown(grossCents)`, renders one row per fee line with the right label + tabular-numeral value.
- Renders "Net to charity" emphasized row.
- When `state === "submitting"` → renders skeleton variant with `aria-busy="true"` and `animate-pulse` (mirrors landing card pattern).
- When `grossCents === 0` → empty/instructional state, not zero rows ("Enter an amount to see the breakdown").
- Visually conveys the 1% Philotimo fee transparently (assert label text "Philotimo platform fee" is present alongside the row value).

**GREEN** `OrderSummary.tsx` accepting `{ breakdown, state }`.

### Phase 7 — CheckoutForm (orchestrator, client component)

**RED** `CheckoutForm.test.tsx`:
- Renders all three sub-components (`AmountSelector`, `DonorDetails`, `OrderSummary`) and the CTA.
- Submitting without amount: CTA stays disabled + amount error appears.
- Submitting with valid amount but bad email: email error appears, CTA enabled until submit, then submit blocks.
- Submit triggers the `onSubmit` callback prop with a `CheckoutPayload`.
- During `onSubmit` resolution, CTA shows "Processing payment" + `aria-busy="true"`; OrderSummary switches to skeleton state.
- If `onSubmit` rejects, the form surfaces a top-level error region with `role="alert"`.

**GREEN** `CheckoutForm.tsx` — `"use client"`, owns state via `useReducer` (cleaner than 5 `useState` calls for related state), reads `breakdown` derivedly from `calculateBreakdown(amountCents)`.

### Phase 8 — Page route

**RED** `src/app/donate/[campaignId]/page.test.tsx`:
- Valid id renders the campaign name + `<CheckoutForm>` (via SSR substring assertions).
- Invalid id throws the Next.js `NEXT_NOT_FOUND` sentinel (mock or inspect by calling the page component directly).
- NavBar + Footer + CheckoutMesh render around the form (consistent shell with landing).

**GREEN** `src/app/donate/[campaignId]/page.tsx`:
```ts
import { notFound } from "next/navigation";
import { getCampaignById } from "@/lib/campaigns";
import { NavBar } from "@/components/landing/NavBar";
import { Footer } from "@/components/landing/Footer";
import { CampaignSummary } from "@/components/checkout/CampaignSummary";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { stubSubmit } from "@/lib/checkout/stubSubmit";

export default async function DonatePage(
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params;
  const campaign = getCampaignById(campaignId);
  if (!campaign) notFound();
  // ... shell + CampaignSummary + CheckoutForm onSubmit={stubSubmit}
}
```

The stub `onSubmit` lives in `src/lib/checkout/stubSubmit.ts` (client-safe, throws a known "not wired — Epic 3" error so tests can assert the error-region path).

### Phase 9 — E2E + accessibility gates

**RED → GREEN** `e2e/checkout.spec.ts`:
- Navigate to `/donate/pcrf` → CampaignSummary visible, AmountSelector visible.
- Click preset $50 → OrderSummary populates, "Net to charity" row reflects fee math.
- Type into custom amount with invalid (`0`) → submit disabled.
- Fill email with invalid → submit shows email error.
- All three viewports (320, 768, 1440) — no horizontal overflow.
- Lighthouse a11y ≥ 95 (matches landing-page gate).

### Phase 10 — Review + commit

1. Strip any inline-style residue (grep for `style={{` in `src/components/checkout/` — only allowed in `CampaignSummary` for the gradient swatch, and that's documented).
2. Re-run full suite: `npm run test`, `npm run typecheck`, `npm run test:e2e`, `npm run build`.
3. Commit per file area; final conventional commit `feat(checkout): port designs/checkout.jsx into modular Tailwind components`.

## Files to Modify / Create

**Create:**
- 1 route file (`page.tsx`) + 1 test
- 4 checkout components + 4 tests + 1 mesh (decorative, no test)
- 4 new UI atoms + 4 tests
- 2 pure-logic modules (`fees.ts`, `validation.ts`) + 2 tests
- 1 stub submit module + 1 type file
- 1 Playwright E2E spec

**Modify:**
- Nothing in existing files unless an atom needs a tiny widening (e.g., `PillButton` already supports the variants needed — verify, don't widen unless required).

## Reused Existing Code

- `src/lib/campaigns.ts::getCampaignById(id)` — route uses for 404 logic.
- `src/components/ui/PillButton.tsx` — the submit CTA.
- `src/components/ui/ArrowRight.tsx` — CTA chevron.
- `src/components/ui/Num.tsx`, `Mono.tsx` — tabular numerals + monospace for amounts.
- `src/components/ui/EyebrowLabel.tsx` — section eyebrow over OrderSummary.
- `src/components/ui/StripedPlaceholder.tsx` — campaign image placeholder.
- `src/components/landing/NavBar.tsx`, `Footer.tsx` — shell reuse for consistent layout.
- `@theme` color tokens in `src/app/globals.css` — no token edits.

## Verification (end-to-end)

1. `npm run test` → all units green (target ~120+ tests, up from 88).
2. `npm run typecheck` → no `any`, no errors.
3. `npm run test:e2e` → Playwright passes on all three viewports.
4. `npm run build` → production build succeeds.
5. Lighthouse run (`npx lhci autorun` or equivalent) → accessibility ≥ 95 on `/donate/pcrf`.
6. Manual sanity in `npm run dev`: visit `/donate/pcrf`, `/donate/wck`, `/donate/directrelief`, `/donate/does-not-exist` (renders 404 not-found page).

## Risks

- **HIGH** — Fee math semantics not yet locked by product. The design's row labels (Philotimo 1%, Endaoment overhead, card processing) are illustrative; the exact percentages need to be locked in `fees.ts` constants and reviewed by Epic 4 (router fee) and Epic 3 (processor fee) owners. Mitigation: keep the percentages in a single named-constants block, well-commented, and easy to amend.
- **MEDIUM** — Submit handoff lands as a stub. If reviewers expect a working flow they'll be confused. Mitigation: PR description explicitly notes the dependency on Epic 3 and the stub's typed contract.
- **MEDIUM** — Client/server boundary. `notFound()` is server-only; `useState` is client-only. The plan splits them correctly, but inadvertently mixing them is a frequent regression source. Mitigation: `"use client"` directive in `CheckoutForm.tsx` only; all other files are server-default.
- **LOW** — Inline-style residue from the design file. Mitigation: grep gate in Phase 10 + documented exception for the campaign gradient swatch.

## Out of Scope (explicit)

- 4-stage `ProcessingStrip` animation — deferred to Epic 3 PR.
- Real on-ramp session API — Epic 3.
- Webhook handling, session → tx mapping — Epic 3.
- Saved payment methods, recurring donations — explicit Epic 2 non-goals.
- Per-locale currency selection — USD only at launch.
