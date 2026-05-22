import { colors } from "@/lib/tokens";

export type ErrorKind = "not-found" | "wrong-network" | "wrong-router" | "unverified";

interface ErrorConfig {
  heading: string;
  body: string;
}

const ERROR_CONTENT: Record<ErrorKind, ErrorConfig> = {
  "not-found": {
    heading: "Transaction not found",
    body: "This transaction hash does not appear in the mempool or on-chain index yet. It may still be pending or it may never have been broadcast. Double-check the URL and try again in a moment.",
  },
  "wrong-network": {
    heading: "Wrong network",
    body: "Eudaimonia receipts are settled on Base (Ethereum L2). This transaction was found on a different network. Make sure you are viewing a Base transaction.",
  },
  "wrong-router": {
    heading: "Unrecognised router contract",
    body: "The DonationRouted event in this transaction does not originate from the Eudaimonia router address. This transaction was not routed through our contract and cannot be verified.",
  },
  "unverified": {
    heading: "Could not verify on-chain transfers",
    body: "The transaction was found but the on-chain transfer pattern does not match an Eudaimonia donation. The expected gross, fee, and net transfers could not be confirmed.",
  },
};

export interface ErrorCardProps {
  kind: ErrorKind;
  /**
   * When provided, a "View on BaseScan ↗" link is rendered so the user can
   * inspect the raw transaction. Do NOT pass `undefined` if you already have
   * the txid — derive the URL before passing it here.
   */
  baseScanUrl?: string;
}

export function ErrorCard({ kind, baseScanUrl }: ErrorCardProps) {
  const { heading, body } = ERROR_CONTENT[kind];

  return (
    <section
      style={{
        maxWidth: 640,
        margin: "80px auto",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          background: colors.canvas,
          border: `1px solid ${colors.urgentSoft}`,
          borderRadius: 12,
          padding: 32,
          boxShadow: "0 1px 3px rgba(0,55,112,0.06)",
        }}
      >
        {/* Error indicator bar */}
        <div
          style={{
            width: 32,
            height: 4,
            borderRadius: 9999,
            background: colors.urgent,
            marginBottom: 20,
          }}
        />

        <h2
          style={{
            margin: "0 0 12px",
            fontSize: 20,
            fontWeight: 400,
            letterSpacing: "-0.2px",
            color: colors.ink,
          }}
        >
          {heading}
        </h2>

        <p
          style={{
            margin: "0 0 20px",
            fontSize: 14,
            fontWeight: 300,
            lineHeight: 1.55,
            letterSpacing: "-0.1px",
            color: colors.inkDeep,
          }}
        >
          {body}
        </p>

        {baseScanUrl && (
          <a
            href={baseScanUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 13,
              fontWeight: 400,
              color: colors.primary,
              textDecoration: "none",
              letterSpacing: "-0.1px",
            }}
          >
            View on BaseScan ↗
          </a>
        )}
      </div>
    </section>
  );
}
