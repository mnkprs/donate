# Eudaimonia — Product Requirements Document (PRD), MVP Phase

**Product name:** Eudaimonia (Greek *φιλότιμο*, "love of honor" — the sense of duty to do right by others). All user-facing copy, domains, and assets should use this name.

## Core Vision
To eliminate the "black box" of charitable giving by providing donors with a beautiful, immutable, real-time receipt of exactly where their money goes, leveraging blockchain tracking without requiring the user to know anything about crypto.

## Target User Persona
The conscious, everyday digital donor who wants to support urgent global causes (e.g., Palestine Children's Relief) but suffers from "donor fatigue" due to a lack of trust in traditional NGO administrative overhead.

## Core User Flow (The Transaction Timeline)
1.  **Selection:** User visits the web app and selects a curated, urgent cause.
2.  **Payment:** User enters an amount (e.g., €50) and pays securely using credit card/Apple Pay via a fiat-to-crypto on-ramp.
3.  **On-Ramp:** The fiat is instantly minted into USDC on the Base network and deposited into our platform's Smart Contract Router.
4.  **Fee Collection:** Our contract skims a 1% platform fee and routes it to our Treasury Wallet.
5.  **Endaoment Delivery:** The remaining 99% of USDC is programmatically pushed directly to the targeted charity's Endaoment contract address.
6.  **The Proof:** The app dashboard updates dynamically, showing the user a beautifully formatted timeline populated with real on-chain Transaction IDs (TxIDs).

## MVP Features Needed for Brainstorming
*   [ ] **Curated Campaign Cards:** Visual landing page displaying 2-3 high-priority causes.
*   [ ] **The Stripe-Style Checkout:** Smooth fiat entry form.
*   [ ] **The Transparency Tracker (The "Pizza Tracker"):** A vertical progress timeline displaying the automated conversion, our platform fee capture, and the final delivery verification link.