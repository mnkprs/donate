# Claude Code Project Rules: Eudaimonia

## Project Overview
We are building **Eudaimonia** — a highly visual, consumer-facing donation platform that acts as a transparent routing layer on top of Endaoment's decentralized philanthropy infrastructure. The name comes from the Greek *φιλότιμο*: the sense of duty to do right by others. The application takes fiat payments, converts them to stablecoins, routes them via a custom smart contract (taking a brand platform fee), and sends the remaining funds directly to Endaoment's smart contracts.

## Technical Constraints & Guardrails
*   **Target Network:** Base Layer-2 (EVM). Never use Ethereum mainnet configurations.
*   **Smart Contract Stack:** Solidity, Foundry (for testing, local forking, and deployment).
*   **Frontend Stack:** Next.js (App Router), React, Tailwind CSS, shadcn/ui.
*   **Design System:** Strict adherence to `DESIGN.md` (Stripe Design System). Do not invent custom "crypto/hacker" UI elements.
*   **Fee Structure:** Maintain a strict, hardcoded platform fee deduction (e.g., 1%) in the routing contract before passing funds to Endaoment.

## Code Style & Testing Guidelines
*   **Smart Contracts:** Always write Foundry tests *before* writing the contract logic (TDD approach). Simulate real network conditions via local Mainnet/Base forking.
*   **Frontend:** Keep components highly modular. Use elegant loading skeletons instead of raw text or basic spinners during blockchain confirmation states.

## Planning Workflow
*   **Persist epic plans:** Whenever `/plan` (ecc) is run against an epic issue, save the resulting plan as a Markdown file under `prompts/`, following the existing naming convention `epic-<N>-<topic>-plan.md` (e.g. `epic-1-landing-plan.md`, `epic-2-checkout-plan.md`, `epic-3-onramp-plan.md`). Include the GitHub issue link and a resumable status line near the top, matching the format used in the prior epic plans.