This maps out how your tech stack connects, highlighting where your own code interacts with third-party APIs.

Markdown
# Technical Architecture Document

## System Diagram (High Level)
[User Interface (Next.js)]
│
▼ (Pays Fiat via Stripe/MoonPay)
[Fiat-to-Crypto On-Ramp] ──(Mints USDC)──► [Our Custom Solidity Router Contract]
│
├──► [Our Treasury Wallet] (1% Fee)
│
└──► [Endaoment Smart Contract] (99%)
│
└──► (Vetted Charity Node)


## Tech Stack Details

### Frontend & UI
*   **Framework:** Next.js (React)
*   **Styling:** Tailwind CSS (configured to match `DESIGN.md`)
*   **Components:** shadcn/ui (radix-ui primitives tailored to Stripe aesthetics)
*   **Web3 Integration:** viem / wagmi (lightweight libraries to read contract events and TxIDs)

### Backend & Blockchain
*   **Blockchain Network:** Base L2 (Provides sub-cent transaction costs, making micro-donations viable).
*   **Smart Contracts:** Solidity (`TransparentDonationRouter.sol`).
*   **External Infrastructure:** 
    *   **Endaoment API/Contracts:** Used to dynamically fetch charity registry entries and serve as the final safe destination for funds.
    *   **Fiat Gateway Integration:** (Brainstorming candidate: Stripe Crypto Onramp or MoonPay API).

## Open Technical Questions for Brainstorming
1.  How will the fiat on-ramp dynamically pass the unique user session/selected charity destination straight into our smart contract function upon a successful credit card swipe?
2.  Should the platform fee be pulled as fiat directly during the payment processing stage, or pulled strictly on-chain via the Solidity routing contract?