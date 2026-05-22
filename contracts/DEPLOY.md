# Deploying the TransparentDonationRouter (Epic 4 Task 6)

Operator runbook for deploying the router to Base Sepolia and Base mainnet.
This is an **outward-facing, irreversible action** — it broadcasts a real
transaction and spends gas. CI does not run it; an operator with funded keys
does, deliberately.

The deploy script (`script/Deploy.s.sol`) is fully unit-tested
(`test/Deploy.t.sol`) via its `_deploy` seam, so the wiring is proven before
any broadcast.

## Prerequisites

- `forge` on PATH (`C:\Users\<you>\.foundry\bin` on this machine).
- A funded deployer key for the target network (testnet ETH for Sepolia; real
  ETH on Base mainnet).
- A [Basescan API key](https://basescan.org/myapikey) for source verification.

## Environment

The script reads three addresses from the environment:

| Var | Meaning |
|---|---|
| `USDC_ADDRESS` | USDC token on the target network |
| `TREASURY_ADDRESS` | Address that receives the 1% platform fee |
| `OWNER_ADDRESS` | Allowlist owner — curates which Endaoment orgs `donate` may forward to (H1). **Must be a multisig in production** (see review M4). |

Canonical USDC addresses:

- **Base mainnet:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Base Sepolia:** `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

`foundry.toml` already maps the `base` / `base_sepolia` RPC aliases and the
Basescan keys (`BASE_RPC_URL`, `BASE_SEPOLIA_RPC_URL`, `BASESCAN_API_KEY`).

## 1. Base Sepolia (do this first)

```powershell
$env:USDC_ADDRESS     = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
$env:TREASURY_ADDRESS = "<your treasury address>"
$env:OWNER_ADDRESS    = "<allowlist owner — a multisig on mainnet>"
$env:BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org"   # or an authenticated URL
$env:BASESCAN_API_KEY = "<key>"

forge script script/Deploy.s.sol:Deploy `
  --rpc-url base_sepolia `
  --account <keystore-account> `    # or --private-key / --ledger
  --broadcast --verify
```

The script logs `TransparentDonationRouter deployed at: 0x...`. Send a sample
donation and confirm the 1/99 split on Basescan.

## 2. Base mainnet

Same command with `--rpc-url base` and the mainnet USDC address. Double-check
`TREASURY_ADDRESS` before broadcasting — it is immutable once deployed.

## 3. Allowlist the target orgs (required — donations revert until you do)

`donate` forwards only to orgs the owner has vetted (H1). A freshly deployed
router has an **empty allowlist, so every donation reverts with `OrgNotAllowed`**
until the owner allowlists each Endaoment org. From the `OWNER_ADDRESS` account
(the multisig on mainnet):

```solidity
router.setOrgAllowed(<endaomentOrg>, true);   // repeat per org; false to revoke
```

Resolve each org's real Entity address from Endaoment's `OrgFundFactory` /
integration API (entities are created per-org, not static) and confirm its
on-chain `baseToken()` is the canonical Base USDC before allowlisting. Emits
`OrgAllowanceUpdated(org, allowed)` for an on-chain audit trail.

## 4. Wire the address into the frontend

No code change. Set the deployed address in the app environment:

```
NEXT_PUBLIC_ROUTER_ADDRESS_BASE_SEPOLIA=0x<deployed-on-sepolia>
NEXT_PUBLIC_ROUTER_ADDRESS_BASE=0x<deployed-on-mainnet>
```

`src/lib/contracts.ts#getRouterAddress(chainId)` then returns the address for
the active chain (and `undefined` until set). Verify with the
`src/lib/contracts.test.ts` suite, which hash-binds the frontend
`DonationRouted` ABI to the on-chain event signature.
