# Code Review: Epic 6 — Live Transparency Receipt Page

**Reviewed**: 2026-05-22
**Branch**: `epic-6-receipt-page` (commits `b397580`..`be2fd85`, 7 commits)
**Scope**: 29 files, ~5,240 insertions (Epic 6 only; Epic 5 commits on the same branch were excluded)
**Decision**: **REQUEST CHANGES**

## Summary

The on-chain decode/verify/build pipeline is well-architected, fully typed, and thoroughly tested (179 Epic-6 tests pass, tsc clean). No CRITICAL or security/data-loss issues. However, there is **one ESLint error that fails the branch's own CI workflow**, two real accessibility gaps on the primary success path, and a latent config bug that silently targets testnet once the app deploys to Base mainnet. None are merge-blockers in the "data loss / vuln" sense, but the lint error and a11y gaps should be fixed before merge; the chainId default must be fixed before mainnet launch.

## Findings

### CRITICAL
None.

### HIGH

**[H1] `src/hooks/useReceipt.ts:392` — ESLint error fails CI: `setState` called directly in effect body.**
`react-hooks/set-state-in-effect` fires on the synchronous `setState({ status: 'not-found' })` in the `!isHex(txid)` early-return. The branch added `.github/workflows/ci.yml`; if it runs `eslint`, this fails the pipeline. The async `onState` callback path is fine — only the synchronous branch trips it.
*Fix*: derive the invalid-hex state during render (e.g. compute `isHex(txid)` and short-circuit to a `not-found` state before/around the effect), or initialize `useState` from a validity check so the effect never sets state synchronously.

**[H2] `src/components/receipt/PizzaTracker.tsx:101–113, 411–430` — fee detail is mouse-only; unreachable by keyboard and touch.**
Active/elevated state and the `feeOnHover` block (fee label, %, deducted amount — meaningful financial data) are wired solely to `onMouseEnter`/`onMouseLeave`, with no `tabIndex`, `onFocus`/`onBlur`. Confirmed on the active path: `ReceiptView` `ready` → `EudaimoniaReceipt` → `PizzaTracker`.
*Fix*: add `tabIndex={0}`, `onFocus`/`onBlur` parity to the stage container; consider always rendering the fee line (collapsed) rather than hover-gating financial info. Wire `role="tooltip"` + `aria-describedby` if kept hover-gated.

**[H3] `src/components/receipt/ReceiptSkeleton.tsx:240` — loading state not announced to assistive tech.**
Root `<div aria-busy="true">` has no `role="status"` / `aria-live`, so the loading→loaded transition is invisible to screen readers. `aria-busy` alone on a non-live element has no defined AT behaviour.
*Fix*: `role="status" aria-live="polite" aria-label="Loading receipt"`. (Shimmer-vs-spinner is an independent visual choice.)

**[H4] `src/lib/receipt/loadReceiptForMetadata.ts:53,119` + `page.tsx:34` + `opengraph-image.tsx:45` — OG metadata defaults to Base Sepolia; both callsites omit `chainId`.**
On Base **mainnet**, `generateMetadata` and the OG image route silently read against Sepolia: `getRouterAddress` returns the Sepolia router, all reads hit testnet, verification fails for real donations → generic fallback card. Latent (the whole app currently runs on Sepolia), but a wrong-metadata bug the moment mainnet ships.
*Fix*: thread an explicit `chainId` (route/searchParam/env) into both callsites; make the function default fail loudly rather than silently fall back to testnet.

### MEDIUM

**[M1] `src/lib/endaoment/verify.ts:109–110, 131, 150–153` — JSDoc understates the throw surface.**
Doc says it "never throws on a mismatch" (true), but the fn *does* throw on RPC failure (`getTransactionReceipt`, line 131) and on corrupt-but-matching logs (`decodeDonationRoutedLog`, 153). The sole client caller (`useReceipt.ts:278`) wraps it in try/catch, so no live crash — but the doc misleads future callers. *Fix*: document the throw conditions, or wrap and return a `reason`.

**[M2] `src/lib/receipt/buildReceiptBundle.ts:~213` — unknown chainId mislabels the network.**
`input.chainId === 8453 ? "Base" : "Base Sepolia"` labels *any* non-mainnet id as "Base Sepolia" — actively misleading on a transparency receipt. *Fix*: match `base.id`/`baseSepolia.id` explicitly from `wagmi/chains`; surface "Unknown" otherwise.

**[M3] `src/lib/receipt/loadReceiptForMetadata.ts:64` — `Number(amount)/1_000_000` loses precision and is inconsistent.**
Above ~`9.007e15` base units (~$9B) `Number(bigint)` silently loses precision; everywhere else uses viem `formatUnits`. *Fix*: `formatUnits(amount, 6)` for consistency and correctness.

**[M4] `src/lib/endaoment/verify.ts:175–191` & `decodeReceipt.ts:209–213` — value-based fee discriminator can misfire.**
The Eudaimonia-fee leg is identified by `value === fee && to !== org`. If the platform fee ever equals the Endaoment skim, the wrong leg is excluded. Acknowledged in the comment but not guarded. *Fix*: assert the arithmetic invariant (`eudaimoniaFee + endaomentFee + netToEntity === gross`) and fail verification if it breaks; longer-term, encode treasury address in the event to discriminate by destination.

**[M5] `src/app/receipt/[txid]/page.tsx:92–99` — server shell never calls `notFound()` for malformed txid.**
`/receipt/garbage` returns a crawlable 200. (`useReceipt` validates via `isHex` client-side, so the UI shows not-found — but the server response/SEO is wrong.) *Fix*: `if (!isHex(txid)) notFound();` in the shell.

**[M6] `page.tsx:34` + `opengraph-image.tsx:45` — `loadReceiptForMetadata` runs twice per request, no dedup.**
`generateMetadata` and the OG handler each fire an independent `getTransactionReceipt`. *Fix*: wrap with React `cache()` to collapse to one RPC/request.

**[M7] Long functions exceed the 50-line guideline.**
`buildReceiptBundle` (~121 lines) and `buildStages` (`stages.ts`, ~139 lines). Linear and readable, but extractable into per-step helpers.

### LOW
- `ReceiptView.tsx:45` & `loadReceiptForMetadata`/`useReceipt` — magic number `84532`; use `baseSepolia.id`.
- `ReceiptSkeleton.tsx` — animation string `"euda-skel 1.6s ease-in-out infinite"` repeated 6×; extract a constant. Index keys on static skeleton list (acceptable but flagged).
- `PizzaTracker.tsx:75` — hardcoded copy `"Five stops · six seconds end-to-end · all final."` not derived from `stages.length`/timing; can silently lie if stages change.
- `opengraph-image.tsx:43` — redundant try/catch around `loadReceiptForMetadata` (it never throws); simplify to `const`.
- `buildReceiptBundle.test.ts:20–24`, `decodeReceipt.test.ts:15` — unused test consts (ESLint warnings).
- `fixtures.ts:111,129` — `as Log` casts on synthetic logs; add a comment on intentionally-absent fields.

## Validation Results

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`) | **Pass** (clean) |
| Lint (`eslint`) | **Fail** — 1 error (H1), 6 warnings |
| Tests (`vitest` — Epic 6 scope) | **Pass** — 179 passed / 15 files |
| Build (`next build`) | Not re-run this session (prior session: pass) |

## Files Reviewed (Epic 6 source)
- `src/hooks/useReceipt.ts` (M, hook + resolver state machine)
- `src/lib/receipt/{decodeReceipt,buildReceiptBundle,loadReceiptForMetadata,fixtures}.ts` (A)
- `src/lib/explorer.ts` (A) — clean
- `src/lib/endaoment/verify.ts` (M)
- `src/lib/stages.ts` (M)
- `src/app/receipt/[txid]/{page,opengraph-image}.tsx` (M/A)
- `src/components/receipt/{ReceiptView,ReceiptSkeleton,ErrorCard,PizzaTracker}.tsx` (A/M)

## Recommended pre-merge fixes
1. **H1** (lint error — fails CI) — required.
2. **H2, H3** (a11y on success path) — required per web testing rules.
3. **M4** invariant guard — cheap, protects financial correctness.
4. **H4** + **M2** — required before mainnet launch (track in `post-epic-actions.md` if deferred).
