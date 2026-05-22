# Security Policy

Eudaimonia routes real funds: it takes fiat payments, converts to stablecoins,
and forwards donations through a custom smart contract on Base to Endaoment's
infrastructure. We take security reports seriously and appreciate responsible
disclosure.

## Supported Versions

This project is pre-1.0 and under active development. Only the latest `main`
and the currently deployed contract address are supported. Older commits and
superseded contract deployments do not receive fixes.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report privately via GitHub Security Advisories:

> https://github.com/mnkprs/donate/security/advisories/new

If you cannot use advisories, email the maintainer listed on the GitHub
profile. Please include:

- A description of the vulnerability and its impact
- Steps to reproduce (PoC, transaction hashes, or affected routes)
- Affected component: frontend, payment/on-ramp flow, or smart contract
- Any suggested remediation

### What to expect

- **Acknowledgement:** within 3 business days
- **Initial assessment:** within 7 business days
- **Coordinated disclosure:** we will agree on a timeline before any public
  detail is shared, and credit you unless you prefer to remain anonymous

## Scope

In scope:

- The `TransparentDonationRouter` contract and its deployment on Base
- Fee calculation, fund routing, and authorization (org allowlist) logic
- The payment / on-ramp flow and any server-side API routes under `src/app/api/`
- Secret handling, auth, and input validation across the frontend

Out of scope:

- Vulnerabilities in Endaoment's contracts (report to Endaoment directly)
- Third-party dependencies without a demonstrated exploit path in this app
- Best-practice suggestions without a concrete security impact
- Findings that require physical access, a compromised end-user device, or
  social engineering of maintainers

## High-Severity Areas

Reports touching these get priority triage, since they can move or misdirect
funds:

- **Fee / accounting manipulation** — bypassing or altering the platform fee
- **Routing / recipient spoofing** — diverting net donation away from the
  allowlisted org or forging `DonationRouted` events
- **Reentrancy or CEI violations** in the router
- **Secret exposure** — leaked Stripe keys, RPC keys, or deployer credentials

## Our Commitments

- We never commit secrets; environment files are gitignored and validated at
  startup. See `.env.local.example` for the expected configuration surface.
- Contract changes are developed test-first (Foundry) and forked against Base
  mainnet before any deployment.
- Dependency updates are automated via Dependabot and reviewed on merge.
