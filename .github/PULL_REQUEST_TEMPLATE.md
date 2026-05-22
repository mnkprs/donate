<!-- Eudaimonia PR template. Keep it tight — reviewers read the summary first. -->

## Summary

<!-- What changed and why, in 2–4 sentences. Link the epic/issue. -->

Closes #

## Type of change

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Docs
- [ ] Test / CI
- [ ] Chore

## Surface touched

- [ ] Frontend (Next.js / React)
- [ ] Smart contracts (Solidity / Foundry)
- [ ] Payments / on-ramp flow
- [ ] Other:

## Test plan

<!-- How you verified this. Reference exact commands. -->

- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` (vitest) passes
- [ ] `forge test` passes (if contracts changed)
- [ ] Manual / E2E verification (describe):

## Security & funds checklist

<!-- Required when touching contracts, payments, or anything moving value. -->

- [ ] No hardcoded secrets, keys, or addresses that belong in env
- [ ] Fee math and CEI ordering unchanged or reviewed
- [ ] No new external call before state updates
- [ ] Allowlist / authorization paths considered

## Screenshots / notes

<!-- For UI changes, before/after at relevant breakpoints. -->
