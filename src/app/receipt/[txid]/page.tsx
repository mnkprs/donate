import { base } from "wagmi/chains";

import { CharityCard } from "@/components/receipt/CharityCard";
import { Footer } from "@/components/receipt/Footer";
import { getCharity } from "@/lib/endaoment/registry";
import { resolveOrgMetadata } from "@/lib/endaoment/metadata";
import { verifyDonation } from "@/lib/endaoment/verify";
import type { Charity, VerificationResult } from "@/types/charity";
import type { Hex } from "@/types/receipt";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReceiptPageProps {
  params: Promise<{ txid: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Parsed, server-side-only loader output. */
interface ReceiptBundle {
  charity: Charity;
  mission: string;
  verification: VerificationResult;
  txid: Hex;
  chainId: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a USDC base-unit bigint (6 decimals) to a human-readable string.
 * e.g. 10_000_000n → "10.000000"
 */
function formatUsdc(value: bigint): string {
  const DECIMALS = 6;
  const divisor = BigInt(10 ** DECIMALS);
  const whole = value / divisor;
  const frac = value % divisor;
  return `${whole}.${frac.toString().padStart(DECIMALS, "0")}`;
}

/**
 * Composes getCharity + resolveOrgMetadata + verifyDonation into a single
 * bundle for the receipt page.
 *
 * Returns `null` if the campaign slug is not found — callers render a
 * not-found message instead of crashing.
 */
async function loadReceiptBundle(
  txid: string,
  campaignId: string,
  chainId: number,
): Promise<ReceiptBundle | null> {
  const charity = getCharity(campaignId, chainId);
  if (!charity) return null;

  // Resolve metadata and verification in parallel — independent I/O.
  const [metadata, verification] = await Promise.all([
    resolveOrgMetadata(charity.ein),
    verifyDonation(txid as Hex, charity, chainId),
  ]);

  return {
    charity,
    mission: metadata.mission,
    verification,
    txid: txid as Hex,
    chainId,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ReceiptPage({ params, searchParams }: ReceiptPageProps) {
  const { txid } = await params;
  const sp = await searchParams;

  const campaignId = typeof sp.campaign === "string" ? sp.campaign : "";
  const chainParam = typeof sp.chain === "string" ? Number(sp.chain) : NaN;
  const chainId = Number.isFinite(chainParam) ? chainParam : base.id;

  const bundle = await loadReceiptBundle(txid, campaignId, chainId);

  // ---- Charity not found ----
  if (bundle === null) {
    return (
      <main>
        <p>Charity not found for campaign &quot;{campaignId}&quot;.</p>
        <Footer />
      </main>
    );
  }

  const { charity, mission, verification } = bundle;
  const baseScanUrl = charity.baseScanUrl ?? undefined;

  // ---- Unverified state ----
  if (!verification.verified) {
    return (
      <main>
        <CharityCard
          data={{
            charity: charity.name,
            ein: charity.ein,
            mission,
            // Placeholder fields — off-chain data not available at this stage
            donorShort: "—",
            amount: "—",
            amountUsdc: "—",
            date: "—",
            time: "—",
            network: "Base",
            txid: txid as Hex,
            txidShort: `${txid.slice(0, 6)}…${txid.slice(-4)}`,
            block: "—",
            confirmations: "—",
            ethIn: "—",
            rate: "—",
            platformFee: "0.00",
            endaomentFee: "0.00",
            orgFund: charity.endaomentOrgAddress ?? "—",
            charityAddr: charity.endaomentOrgAddress ?? "—",
            donorFee: "0.00",
          }}
          baseScanUrl={baseScanUrl}
        />
        <section aria-label="Verification status" style={{ padding: "24px 64px" }}>
          <p><strong>Unverified</strong></p>
          <p>This transaction could not be verified on-chain.</p>
          <p>Reason: {verification.reason}</p>
        </section>
        <Footer />
      </main>
    );
  }

  // ---- Verified state ----
  const { gross, fee, net } = verification;

  return (
    <main>
      <CharityCard
        data={{
          charity: charity.name,
          ein: charity.ein,
          mission,
          donorShort: "—",
          amount: formatUsdc(gross),
          amountUsdc: formatUsdc(gross),
          date: "—",
          time: "—",
          network: "Base",
          txid: txid as Hex,
          txidShort: `${txid.slice(0, 6)}…${txid.slice(-4)}`,
          block: "—",
          confirmations: "—",
          ethIn: "—",
          rate: "—",
          platformFee: formatUsdc(fee),
          endaomentFee: formatUsdc(fee),
          orgFund: charity.endaomentOrgAddress ?? "—",
          charityAddr: charity.endaomentOrgAddress ?? "—",
          donorFee: "0.00",
        }}
        baseScanUrl={baseScanUrl}
      />
      <section aria-label="On-chain amounts" data-txid={txid} style={{ padding: "24px 64px" }}>
        <dl>
          <div>
            <dt>Gross (USDC)</dt>
            <dd>{formatUsdc(gross)}</dd>
          </div>
          <div>
            <dt>Fee (USDC)</dt>
            <dd>{formatUsdc(fee)}</dd>
          </div>
          <div>
            <dt>Net to charity (USDC)</dt>
            <dd>{formatUsdc(net)}</dd>
          </div>
        </dl>
      </section>
      <Footer />
    </main>
  );
}
