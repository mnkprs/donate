import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Eudaimonia",
  description:
    "What data Eudaimonia collects, why Stripe and our on-ramp partner handle payment details, and the public nature of on-chain donation data.",
};

const LAST_UPDATED = "May 23, 2026";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p className="text-base leading-[1.7] text-slate">
        This policy explains what we collect when you donate, what we
        deliberately do not collect, and which data is public because it lives
        on a blockchain. We collect as little as possible to route your gift and
        send your receipt.
      </p>

      <LegalSection heading="We do not store your card data">
        <p>
          Eudaimonia never sees or stores your full card number, CVC, or bank
          credentials. Payment details are collected and processed directly by
          Stripe and our on-ramp partner, who are responsible for that
          payment-card data under their own terms and PCI obligations. Those
          providers convert your fiat payment to a stablecoin; we receive only
          confirmation that the payment succeeded.
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <p>The minimal data we handle is:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            Your email address, so we can send your donation receipt and any
            transaction status updates.
          </li>
          <li>
            The campaign you selected and the donation amount, to route the gift
            and itemize fees.
          </li>
          <li>
            An optional note, if you choose to add one. Do not include sensitive
            information here.
          </li>
          <li>
            Basic, non-identifying technical data (such as error logs) needed to
            keep the platform reliable.
          </li>
        </ul>
        <p>
          We do not sell your data and we do not use it for advertising.
        </p>
      </LegalSection>

      <LegalSection heading="Payment PII stays with our processors">
        <p>
          Personally identifiable payment information — card numbers, billing
          details, and any identity verification an on-ramp requires — is held
          by Stripe and the on-ramp provider, not by Eudaimonia. Requests to
          access or delete that payment PII are governed by those providers&apos;
          privacy policies. We can delete the limited records we hold (your
          email and donation metadata) on request.
        </p>
      </LegalSection>

      <LegalSection heading="On-chain data is public">
        <p>
          Your donation settles on the Base public ledger. The donation amount,
          wallet addresses, the platform-fee deduction, timestamps, and the
          routing path through Endaoment&apos;s contracts are permanently
          recorded and visible to anyone — we cannot make on-chain data private
          or remove it. Your email and personal payment details are never
          written on-chain, but the movement of funds is. Treat any optional
          on-chain note as public.
        </p>
      </LegalSection>

      <LegalSection heading="Data retention and contact">
        <p>
          We retain your email and donation metadata only as long as needed to
          provide receipts and meet record-keeping obligations. To ask about the
          data we hold, contact us at the address published on our site. This
          policy may be updated; material changes are reflected in the
          &quot;last updated&quot; date above.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
