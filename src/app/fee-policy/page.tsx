import type { Metadata } from "next";

import { FeeDisclosure } from "@/components/legal/FeeDisclosure";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Fee Policy — Eudaimonia",
  description:
    "How the Eudaimonia platform fee is structured, how it is deducted on-chain before funds reach Endaoment, and what other fees appear on your receipt.",
};

const LAST_UPDATED = "May 23, 2026";

export default function FeePolicyPage() {
  return (
    <LegalPage title="Fee Policy" lastUpdated={LAST_UPDATED}>
      <p className="text-base leading-[1.7] text-slate">
        This page explains the platform fee Eudaimonia retains on every
        donation, how it is taken on-chain by our router contract, and how it
        appears on your receipt alongside the other fees you see at checkout.
      </p>

      <LegalSection heading="Platform fee">
        <p>
          Eudaimonia retains a flat platform fee on every donation. It is the
          only amount Eudaimonia keeps, and it is the same percentage no matter
          which charity you select or how large the gift is.
        </p>
        <FeeDisclosure />
      </LegalSection>

      <LegalSection heading="How the fee flows">
        <p>
          Your donation is charged in fiat, converted to USDC on the Base
          Layer-2 network, and routed through the Eudaimonia smart contract.
          The platform fee is deducted on-chain by that contract before the
          remaining funds are forwarded to the Endaoment Org Fund, which then
          grants to the vetted 501(c)(3) you selected. Because the deduction
          happens on-chain, every step — including the fee — is publicly
          verifiable on Base.
        </p>
      </LegalSection>

      <LegalSection heading="Other fees on your receipt">
        <p>
          Two other line items can appear at checkout and on your receipt.
          They are disclosed separately so you can see exactly where every
          cent of your gift goes:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong className="font-medium text-ink">Endaoment fee</strong> —
            Endaoment&apos;s own charitable-infrastructure fee, set and
            collected by Endaoment.
          </li>
          <li>
            <strong className="font-medium text-ink">Card processing</strong>{" "}
            — the payment processor&apos;s fee for accepting your card. This
            is shown for transparency and is taken by the processor, not by
            Eudaimonia.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          If the platform fee or the way it is collected changes, this page
          will be updated and the &quot;last updated&quot; date above will
          change with it. The fee charged at checkout always matches the
          amount the router contract deducts on-chain.
        </p>
      </LegalSection>

      <LegalSection heading="Related policies">
        <p>
          See our{" "}
          <a
            href="/terms"
            className="text-ink underline underline-offset-2 hover:opacity-70"
          >
            Terms of Service
          </a>{" "}
          for the full agreement governing donations through Eudaimonia, and
          our{" "}
          <a
            href="/privacy"
            className="text-ink underline underline-offset-2 hover:opacity-70"
          >
            Privacy Policy
          </a>{" "}
          for what data we collect and what stays with our payment processors.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
