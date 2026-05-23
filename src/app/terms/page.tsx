import type { Metadata } from "next";

import { FeeDisclosure } from "@/components/legal/FeeDisclosure";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Eudaimonia",
  description:
    "How Eudaimonia routes fiat donations to Endaoment on Base L2, the platform fee, and the irreversible, public nature of on-chain donations.",
};

const LAST_UPDATED = "May 23, 2026";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <p className="text-base leading-[1.7] text-slate">
        These terms govern your use of Eudaimonia. By making a donation through
        this platform you agree to them. Please read the sections on
        irreversibility and the public ledger carefully — donations made here
        cannot be undone.
      </p>

      <LegalSection heading="What Eudaimonia is">
        <p>
          Eudaimonia is a transparent routing layer built on top of
          Endaoment&apos;s decentralized philanthropy infrastructure. We are not
          the charity and we do not custody your funds long-term. We accept your
          payment, convert it to a stablecoin, and route it through our smart
          contract to an Endaoment Org Fund, which forwards it to the vetted
          501(c)(3) you selected.
        </p>
      </LegalSection>

      <LegalSection heading="How your donation is processed">
        <p>
          Your donation is charged in fiat, converted to USDC (a US-dollar
          stablecoin), and settled on the Base Layer-2 network. The funds pass
          through the Eudaimonia router contract, which deducts the platform fee
          described below, and then on to Endaoment&apos;s contracts. Each step
          is recorded on-chain and surfaced in your receipt.
        </p>
      </LegalSection>

      <LegalSection heading="On-chain donations are irreversible">
        <p>
          Once your donation is broadcast to the blockchain it is final. We
          cannot reverse, cancel, refund, or claw back a confirmed on-chain
          transaction — no party can. Verify the charity, the amount, and the
          fee breakdown before you confirm. If a transaction fails before it is
          broadcast, no funds are routed.
        </p>
      </LegalSection>

      <LegalSection heading="On-chain donations are public">
        <p>
          The Base network is a public ledger. Transaction amounts, wallet
          addresses, timestamps, and the routing path of your donation are
          permanently visible to anyone. Do not include sensitive personal
          information in any optional on-chain note. Your payment details remain
          private (see our Privacy Policy), but the on-chain movement of funds is
          public by design — that transparency is the point.
        </p>
      </LegalSection>

      <LegalSection heading="Platform fee">
        <p>
          Eudaimonia retains a flat platform fee on every donation, taken
          on-chain by the router contract before funds reach Endaoment. The fee
          is itemized in your receipt and is the only amount Eudaimonia keeps.
        </p>
        <FeeDisclosure />
      </LegalSection>

      <LegalSection heading="No warranty">
        <p>
          The platform is provided &quot;as is.&quot; We rely on third-party
          payment processors, on-ramp providers, the Base network, and
          Endaoment&apos;s contracts, and we cannot guarantee uninterrupted
          availability. Tax-deductibility of your gift is determined by
          Endaoment and applicable law; your receipt is your record.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to these terms">
        <p>
          We may update these terms as the platform evolves. Material changes
          will be reflected in the &quot;last updated&quot; date above.
          Continued use after a change constitutes acceptance.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
