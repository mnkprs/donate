# Code Review: Epic 4 — TransparentDonationRouter

**Reviewed:** 2026-05-22
**Scope:** 13 commits, `44f29e0^..6ea6ad9` (Tasks 4–7 + foundational toolchain/contract + docs)
**Diff:** +1263 / -0 across 18 files (all additive)
**Decision:** APPROVE WITH COMMENTS — code is mergeable and already on `main`; findings below gate **mainnet deploy** and **Epic 5**, not a merge.

## Summary

A clean, disciplined, fully-additive epic: TDD throughout (RED→GREEN→REFACTOR commits), correct CEI ordering, `nonReentrant`, SafeERC20, lossless fee math, and a value-faithful event decoder. No CRITICAL issues. The material findings are all about **trust boundaries that Epic 5 / deploy must close**: an unverified Endaoment interface signature, a spoofable `DonationRouted` event, and two frontend type/validation gaps.

## Findings

### CRITICAL
None.

### HIGH

**H1 — `DonationRouted` event is spoofable; org address is unvalidated** (`TransparentDonationRouter.sol:85-99`)
`endaomentOrg` is fully caller-controlled with only a zero-address check. A donor can route their own funds to *any* contract they control and emit a fully legitimate-looking `DonationRouted(donor, attackerOrg, gross, fee, net)` log. Impact is bounded to the caller's own money on-chain, but **if Epic 5's receipt pipeline treats this event as proof a donation reached a real charity, the proof is forgeable.**
→ *Fix:* Epic 5 must validate `org` against Endaoment's on-chain registry/factory before honoring any receipt — never trust the event alone. Optionally allowlist orgs in the router.
→ ✅ **REMEDIATED (2026-05-22):** In-router allowlist shipped via TDD. `donate` reverts `OrgNotAllowed(org)` unless the owner has allowlisted the org (`setOrgAllowed`, onlyOwner, `OrgAllowanceUpdated` event); owner wired at construction via OZ `Ownable`. The event can no longer legitimize an attacker-controlled recipient. 100% router coverage; `DEPLOY.md` documents the required post-deploy allowlisting step. **Tradeoff accepted:** reintroduces an owner key the immutable design omitted (see M4) — owner MUST be a multisig; consider `Ownable2Step`. Epic 5 should still validate `org` registry-side for defense-in-depth.

**H2 — Unverified `IEndaomentEntity.donate` signature blocks safe mainnet deploy** (`interfaces/IEndaomentEntity.sol:8`, `test/fork/RouterFork.t.sol:44-64`)
The interface comment admits the signature is unconfirmed against the real ABI, and the only test that would prove it against a live org is `[SKIP]` until env vars are set. A selector mismatch bricks 100% of donations until redeploy.
→ *Fix:* Gate mainnet deploy on the fork test running GREEN against a real Base Endaoment org.
→ ✅ **PARTIALLY REMEDIATED (2026-05-22):** Signature **verified** against primary source — `donate(uint256)` is correct (`endaoment/endaoment-contracts-v2`, commit `02c7557`, `src/Entity.sol#L120`; `Org`/`Fund` inherit unchanged). Interface comment now carries the citation + the dual-`transferFrom` pull semantics, eliminating the *unverified-signature* risk. **Still open:** the live fork-test gate is NOT discharged — `RouterFork.t.sol` remains `[SKIP]` pending real `BASE_RPC_URL` + `ENDAOMENT_ORG`. Mainnet deploy stays gated on running that test GREEN.

### MEDIUM

**M1 — Frontend `RawEventLog.topics` type is wrong, forcing a load-bearing cast** (`src/lib/contracts.ts:105-108, 125`)
The declared union `(Hex | readonly Hex[] | null)[]` is viem's filter-*input* `LogTopic` shape, not its log-*output* shape (`readonly [] | readonly [Hex, ...Hex[]]`). The JSDoc claim that it "mirrors viem's own log shape" is false, and the `as [Hex, ...Hex[]]` cast at line 125 exists only to paper over the mismatch — violating the project's "avoid unsafe casts" rule.
→ *Fix:* Type `topics` as `readonly [] | readonly [Hex, ...Hex[]]`, delete the cast, correct the JSDoc.

**M2 — `getRouterAddress` accepts the zero address** (`src/lib/contracts.ts:66-73`)
Validation is `isAddress(candidate)` only, and `isAddress("0x000…0")` returns `true`. `.env.local.example:31-32` explicitly states "Production must reject the zero address explicitly," but no guard exists and no test covers it. The Epic 4 `NEXT_PUBLIC_` vars default blank (not `0x0`), so this is a defense-in-depth gap rather than imminent loss — but the example file demonstrates `0x0` as a placeholder pattern operators may copy.
→ *Fix:* Reject zero address in `getRouterAddress`; pin `isAddress(candidate, { strict: true })`; add a test.

**M3 — Fee-on-transfer / received-amount assumption is implicit** (`TransparentDonationRouter.sol:91-97`)
Split is computed from the requested `amount`, not the balance actually received. Safe for canonical USDC (non-fee-on-transfer), but `usdc` is set from an unvalidated env var, and a misconfigured deploy or a future second stablecoin would break `fee + net == received`.
→ *Fix:* Either measure `balanceOf` delta and split that, or document + assert the USDC-only, non-fee-on-transfer invariant at deploy.

**M4 — `treasury` is immutable with no rotation path** (`TransparentDonationRouter.sol:31, 58`)
A deliberate "transparent" design choice that removes admin-key risk, but a wrong/compromised/lost treasury is unrecoverable without redeploy.
→ *Fix:* Confirm treasury is a multisig (not an EOA) before mainnet, and document it in the runbook. (No code change required if accepted.)

### LOW
- **L1** Unit suite proves correctness only under ideal-token/honest-org conditions; no fee-on-transfer mock, no `false`-returning ERC20, no under-pulling org. Green tests ≠ coverage of H1/M3. (`test/mocks/*`)
- **L2** Foreign-event rejection test asserts on viem's internal message string `/signature/i`; prefer the error class for upgrade resilience. (`contracts.test.ts:186`)
- **L3** `.env.local.example` mixes server-only `ROUTER_ADDRESS_*` and client `NEXT_PUBLIC_ROUTER_ADDRESS_*` without documenting the relationship.

## Validation

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`) | Pass (run by reviewer subagent) |
| Lint (ESLint) | Pass |
| Frontend tests | Pass (prior session: 489 passed, 1 skipped) |
| Solidity (`forge test`) | Not run this review; fork suite intentionally `[SKIP]` pending Epic 5 |
| Build | Not run |

## Files Reviewed
All 18 (Added unless noted): contract `TransparentDonationRouter.sol`, `interfaces/IEndaomentEntity.sol`, `script/Deploy.s.sol`, unit/fork/mock tests, `foundry.toml`, `remappings.txt`, `DEPLOY.md`, `.gitignore`; frontend `src/lib/contracts.ts`, `contracts.test.ts`, `wagmi.ts` (M); `.env.local.example` (M); `prompts/epic-4-router-plan.md`.

## Recommended order before mainnet
1. H2 — prove the Endaoment interface on a live fork.
2. H1 — design Epic 5 receipts to validate `org`, not trust the event.
3. M1 + M2 — quick frontend fixes (type + zero-address guard), ship together.
4. M3/M4 — decide & document the USDC-only and multisig-treasury invariants.
