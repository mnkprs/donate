# Epic 4 — TransparentDonationRouter Smart Contract — TDD Plan

> **GitHub issue:** [#5 — Epic 4 — TransparentDonationRouter smart contract](https://github.com/mnkprs/donate/issues/5)
> **Status:** Tasks 0–5 COMPLETE. Task 5 (forked Base integration) is GREEN-as-scaffold: added `test/fork/RouterFork.t.sol` — full real-USDC donate flow asserting the 1/99 split as treasury/org balance deltas. It is **Epic-5 gated**: `setUp` reads `BASE_RPC_URL` + `ENDAOMENT_ORG` *before* any fork (an empty URL makes `vm.createSelectFork` revert and would error the whole run), forks only when both are present, and records `forkReady`; the test calls `vm.skip(true, reason)` early otherwise. With env unset it reports `[SKIP]`, not fail. Verified RED→GREEN: a naive ungated first cut failed with `vm.createSelectFork: invalid rpc url:`; the gate converts that crash into a clean skip. Full run now: **17 passed, 0 failed, 1 skipped** (exit 0). No production-contract change (router still at 100% coverage). Uses `deal()` (real USDC has no public mint) and hardcoded Base USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`. Resume at **Task 6** — deploy + verify + frontend config wiring (`script/Deploy.s.sol`, `src/lib/contracts.ts`).
> **Fork run note:** Once Epic 5 supplies the real org, run with `forge test --match-path test/fork/* --fork-url $BASE_RPC_URL` (and `ENDAOMENT_ORG` set).
> **Run note:** Run forge from inside `contracts/` (`Set-Location contracts; forge test`). The `--root contracts` form hit a stale-cache "Nothing to compile"; `forge clean` then in-dir runs work.
> **Toolchain note:** `forge` lives at `C:\Users\Manos\.foundry\bin\forge.exe` (v1.7.1) — not on PATH; prepend `$env:USERPROFILE\.foundry\bin` to PATH per session. Deps are shallow-cloned into `contracts/lib` (gitignored), not submodules. Run forge with `--root contracts`.
> **Branch (suggested):** `epic-4-router`

## Context

Epic 4 (GitHub issue #5) builds the on-chain heart of Eudaimonia: a Solidity
contract on Base L2 that receives USDC, skims a hardcoded 1% platform fee to the
treasury, and forwards the remaining 99% to the targeted Endaoment org Entity.
This is the contract Epic 3's on-ramp settles into and that Epic 5's receipt
decoder reads events from.

This is the project's **first Solidity work** — no `contracts/` directory or
Foundry toolchain exists yet. Per `CLAUDE.md`, smart contracts are written
**TDD-first**: Foundry tests precede contract logic, and real network conditions
are simulated via Base mainnet forking.

The pattern mirrors prior epics: granular testable units, RED tests before
GREEN implementation, pure/where-possible logic, deterministic local mocks for
fast unit tests, and a forked-network suite for real integration.

## Decisions Locked In

| Question | Decision | Source |
|---|---|---|
| Endaoment forward mechanism | **Approve net USDC to the org Entity, then call `Entity.donate(net)`** — so Endaoment's own 1.5% fee + accounting run on-chain, matching the receipt UI's "Routed" stage | This session (user) |
| Fork-test dependency on Epic 5 | **Mock now, gate fork on Epic 5** — full logic coverage against `MockEndaomentOrg` + `MockUSDC`; fork tests written but skipped when the real org address env var is unset | This session (user) |
| `txHash` in event args | **Dropped** — a contract cannot reference its own tx hash; the hash already rides on every emitted log (`receipt.transactionHash`). Off-chain decoder reads it for free. | Correction to issue spec |
| Token support | **USDC only** (6 decimals), immutable reference | Issue #5 non-goals |
| Upgradeability | **None** — immutable contract, no proxy | Issue #5 non-goals |
| Fee | **Hardcoded `FEE_BPS = 100` (1%) + immutable treasury**, no admin-mutable fee | Issue #5 |
| Rounding | **Integer floor**: `fee = amount * FEE_BPS / 10_000`, `net = amount - fee`; conservation `fee + net == amount` always holds | This plan |

## Target Architecture

```
contracts/
├── foundry.toml                       solc, optimizer, remappings, fork RPC, fuzz runs
├── remappings.txt                     @openzeppelin/ → lib/openzeppelin-contracts/
├── lib/openzeppelin-contracts/        forge install (SafeERC20, ReentrancyGuard, IERC20)
├── src/
│   ├── TransparentDonationRouter.sol  the contract
│   └── interfaces/
│       └── IEndaomentEntity.sol       { function donate(uint256 amount) external; }
├── test/
│   ├── TransparentDonationRouter.t.sol  unit suite (Tasks 1–4)
│   ├── fork/
│   │   └── RouterFork.t.sol             forked Base suite (Task 5, Epic-5 gated)
│   └── mocks/
│       ├── MockERC20.sol                mint-able 6-decimal USDC stand-in
│       ├── MockEndaomentOrg.sol         implements IEndaomentEntity.donate (transferFrom + record)
│       └── MockReentrantOrg.sol         re-enters router.donate() to prove the guard
└── script/
    └── Deploy.s.sol                     reads USDC + treasury from env, broadcasts, logs address
```

Off-chain integration touchpoint:
- `src/lib/contracts.ts` (new) — `ROUTER_ADDRESS` per chain + exported `DonationRouted` event ABI for the receipt decoder. (`src/lib/wagmi.ts` currently holds no contract address.)

## Contract Surface (target GREEN state)

```solidity
contract TransparentDonationRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20  public immutable usdc;
    address public immutable treasury;
    uint256 public constant FEE_BPS = 100;          // 1%
    uint256 public constant BPS_DENOMINATOR = 10_000;

    event DonationRouted(
        address indexed donor,
        address indexed org,
        uint256 gross,
        uint256 fee,
        uint256 net
    );

    constructor(address _usdc, address _treasury);  // zero-address checks
    function previewSplit(uint256 amount) public pure returns (uint256 fee, uint256 net);
    function donate(address endaomentOrg, uint256 amount) external nonReentrant;
}
```

`donate` follows checks-effects-interactions:
1. **Checks** — `endaomentOrg != address(0)`, `amount > 0`.
2. **Effects** — compute `(fee, net)` via `previewSplit`.
3. **Interactions** — `usdc.safeTransferFrom(donor, this, amount)`; `usdc.safeTransfer(treasury, fee)`; `usdc.forceApprove(org, net)`; `IEndaomentEntity(org).donate(net)`.
4. **Emit** `DonationRouted(donor, org, amount, fee, net)`.

---

## Granular TDD Task List

### Task 0 — Toolchain + Foundry scaffold *(prerequisite, not TDD)*
**Blocker:** Foundry is **not installed** (`forge`/`foundryup` absent on PATH).
- Install: `foundryup` (Windows: via Git Bash / WSL, then ensure `forge` on PATH).
- `forge init contracts/ --no-git` (or manual `foundry.toml` to keep it inside the existing repo).
- `forge install OpenZeppelin/openzeppelin-contracts --no-commit`.
- Write `foundry.toml`: `solc = "0.8.24"`, `optimizer = true`, `optimizer_runs = 200`, `[rpc_endpoints] base = "${BASE_RPC_URL}"`, `[fuzz] runs = 256`, remappings.
- Smoke: `forge build` compiles an empty project.

### Task 1 — Constructor & immutables *(RED → GREEN)* ⬅ **START HERE**
RED tests in `test/TransparentDonationRouter.t.sol`:
- `test_Constructor_SetsUsdcAndTreasury` — getters return the constructor args.
- `test_Constructor_RevertsOnZeroUsdc` — `vm.expectRevert`.
- `test_Constructor_RevertsOnZeroTreasury` — `vm.expectRevert`.
- `test_FeeConstants` — `FEE_BPS == 100`, `BPS_DENOMINATOR == 10_000`.

GREEN: implement constructor with zero-address checks; promote storage to `immutable`; declare constants.

### Task 2 — Fee split math *(RED → GREEN)*
- `test_PreviewSplit_OnePercent` — `100e6 → (1e6, 99e6)`.
- `test_PreviewSplit_RoundsDown` — `99 → (0, 99)` (sub-100-unit dust).
- `testFuzz_PreviewSplit_Conservation` — `fee + net == amount` and `fee == amount * 100 / 10_000` for all inputs.

GREEN: implement `previewSplit` pure function.

### Task 3 — Happy-path donate *(RED → GREEN)*
Setup: deploy `MockERC20` (USDC), `MockEndaomentOrg`, router; mint USDC to donor; `vm.prank(donor)` approve router.
- `test_Donate_PullsGrossFromDonor` — donor balance drops by `amount`.
- `test_Donate_SendsFeeToTreasury` — treasury balance `== fee`.
- `test_Donate_ForwardsNetToOrg_ViaDonate` — mock org records `net` received through its `donate()`.
- `test_Donate_LeavesNoLeftoverAllowance` — `usdc.allowance(router, org) == 0` after.
- `test_Donate_EmitsDonationRouted` — `vm.expectEmit(true,true,false,true)` with `(donor, org, amount, fee, net)`.

GREEN: implement `donate` (CEI as above).

### Task 4 — Guards & reverts *(RED → GREEN)*
- `test_Donate_RevertsOnZeroOrg`.
- `test_Donate_RevertsOnZeroAmount`.
- `test_Donate_RevertsWhenNoAllowance` — SafeERC20 revert.
- `test_Donate_RevertsWhenInsufficientBalance`.
- `test_Donate_NonReentrant` — `MockReentrantOrg.donate()` re-enters `router.donate()`; expect `ReentrancyGuardReentrantCall`.

GREEN: ordering already satisfies most; add `MockReentrantOrg`; confirm `nonReentrant`.

### Task 5 — Forked Base mainnet integration *(RED → GREEN, Epic-5 gated)*
`test/fork/RouterFork.t.sol`:
- `setUp` — `vm.createSelectFork(vm.envOr("BASE_RPC_URL", ""))`; `vm.skip(true)` when unset.
- Real USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- Real org from `vm.envOr("ENDAOMENT_ORG", address(0))`; skip until Epic 5 supplies it.
- `testFork_Donate_RealUsdc_RealOrg` — `deal` USDC to donor, approve, donate, assert treasury fee delta + org balance delta.

### Task 6 — Deploy + verify + config wiring
- `script/Deploy.s.sol` — reads `USDC_ADDRESS`, `TREASURY_ADDRESS` from env; broadcasts; logs deployed address.
- Deploy + verify on **Base Sepolia**, then **Base mainnet** (`forge script --rpc-url --broadcast --verify` with Basescan key).
- Record address + export `DonationRouted` ABI in `src/lib/contracts.ts`; reference from `src/lib/wagmi.ts`.

### Task 7 — Receipt-decoder handshake *(follow-up / Epic 5 seam)*
- Confirm `DonationRouted(gross, fee, net)` maps onto `buildStages` input (`gross→routing`, `fee→eudaimonia`, `net→settlement`). Export the typed event so Epic 5 can decode a real log. Likely lands in Epic 5; noted here so the event shape stays stable.

## Risks
- **HIGH (env):** Foundry not installed — Task 0 blocks everything.
- **HIGH (dep):** Endaoment Entity `donate(uint256)` signature assumed; confirm against the real ABI when Epic 5 lands. `IEndaomentEntity` is the single seam to adjust.
- **MED:** USDC `forceApprove` used for approval resets (safe default).
- **MED:** Basescan verification flakiness / API key config.
- **LOW:** Fee rounding dust on sub-$0.01 donations (acceptable; conservation holds).

## Test Plan (acceptance, from issue #5)
- [ ] `forge test` green (unit + fuzz) against mocks.
- [ ] `forge test --match-path test/fork/*` green once `BASE_RPC_URL` + real org set.
- [ ] Deployed + verified on Base Sepolia; sample tx splits 1/99 correctly.
- [ ] `DonationRouted` decodable into `buildStages` inputs.
- [ ] Router address recorded in frontend config.
