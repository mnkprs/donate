"use client";

import { useEffect, useState } from "react";
import { baseSepolia } from "wagmi/chains";

import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Mono } from "@/components/ui/Mono";
import { Num } from "@/components/ui/Num";
import { getRouterAddress } from "@/lib/contracts";
import { getPublicClient } from "@/lib/publicClient";
import {
  DEFAULT_RECENT_LIMIT,
  fetchRecentDonations,
  type OnChainLog,
  type RecentDonation,
  type RecentDonationsClient,
} from "@/lib/receipt/recentDonations";
import { colors } from "@/lib/tokens";

/**
 * Landing-page "Live receipts" strip (Epic 1 follow-up E1.1).
 *
 * Wired to real on-chain `DonationRouted` logs via {@link fetchRecentDonations}.
 * There is deliberately no fixture fallback: when the router is unconfigured,
 * the RPC fails, or the recent window holds no donations, the strip shows a
 * single honest "Receipts unavailable" line rather than fabricated rows.
 *
 * Split mirrors `useReceipt`: {@link LiveReceiptStripView} is a pure,
 * SSR-testable presentational component driven by a discriminated `status`;
 * the exported {@link LiveReceiptStrip} is the thin client wrapper that runs the
 * async load in an effect. The view holds all display logic; the wrapper is glue.
 */

// ---------------------------------------------------------------------------
// View status
// ---------------------------------------------------------------------------

export type LiveReceiptStatus =
  | { kind: "loading" }
  | { kind: "ready"; donations: RecentDonation[] }
  | { kind: "unavailable" };

const HONEST_UNAVAILABLE_COPY = "Receipts unavailable";
const SKELETON_ROWS = 3;

// ---------------------------------------------------------------------------
// Presentational view (pure)
// ---------------------------------------------------------------------------

interface LiveReceiptStripViewProps {
  status: LiveReceiptStatus;
}

export function LiveReceiptStripView({ status }: LiveReceiptStripViewProps) {
  return (
    <div
      style={{
        marginTop: 48,
        padding: "14px 20px",
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(8px)",
        border: `1px solid ${colors.hairline}`,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        gap: 24,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <span
          data-euda-motion=""
          style={{
            width: 7,
            height: 7,
            borderRadius: 9999,
            background: colors.primary,
            boxShadow: "0 0 0 4px rgba(83,58,253,0.12)",
            animation: "euda-dot-pulse 1.2s ease-in-out infinite",
          }}
        />
        <EyebrowLabel color={colors.ink}>Live receipts</EyebrowLabel>
      </div>

      <div
        style={{
          display: "flex",
          gap: 32,
          fontSize: 13,
          color: colors.inkDeep,
          letterSpacing: "-0.1px",
          fontFeatureSettings: '"tnum","ss01"',
          overflow: "hidden",
          whiteSpace: "nowrap",
          flex: 1,
          minWidth: 0,
        }}
      >
        <LiveReceiptBody status={status} />
      </div>
    </div>
  );
}

function LiveReceiptBody({ status }: { status: LiveReceiptStatus }) {
  if (status.kind === "loading") return <SkeletonRows />;
  if (status.kind === "unavailable") return <UnavailableNotice />;
  return (
    <>
      {status.donations.map((donation) => (
        <ReceiptRow key={donation.txid} donation={donation} />
      ))}
    </>
  );
}

function ReceiptRow({ donation }: { donation: RecentDonation }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Num size={13}>{`$${donation.netUsdc}`}</Num>
      <span style={{ color: colors.inkMute }}>to</span>
      <Mono size={11} color={colors.inkDeep}>
        {donation.orgShort}
      </Mono>
      <Mono size={11} color={colors.inkMute}>
        {donation.txidShort}
      </Mono>
      <span
        style={{ color: colors.inkMute }}
      >{`· block ${donation.blockNumber.toString()}`}</span>
    </div>
  );
}

function UnavailableNotice() {
  return (
    <span style={{ color: colors.inkMute, letterSpacing: "-0.1px" }}>
      {HONEST_UNAVAILABLE_COPY}
    </span>
  );
}

function SkeletonRows() {
  return (
    <div
      data-testid="live-receipt-skeleton"
      aria-hidden="true"
      style={{ display: "flex", gap: 32, alignItems: "center" }}
    >
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <span
          key={i}
          data-euda-motion=""
          style={{
            display: "inline-block",
            width: 132,
            height: 12,
            borderRadius: 6,
            background: colors.hairlineMute,
            animation: "euda-skel 1.6s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default loader (real I/O — adapts the viem PublicClient to the loader port)
// ---------------------------------------------------------------------------

export interface LoadRecentDonationsArgs {
  chainId: number;
  limit: number;
}

export type RecentDonationsLoader = (
  args: LoadRecentDonationsArgs,
) => Promise<RecentDonation[]>;

/**
 * Production loader: resolves the router address, builds a viem public client,
 * and reads recent donations. Throws when the router is not configured for the
 * chain so the wrapper falls into the "unavailable" state.
 */
export async function defaultLoadRecentDonations({
  chainId,
  limit,
}: LoadRecentDonationsArgs): Promise<RecentDonation[]> {
  const routerAddress = getRouterAddress(chainId);
  if (!routerAddress) {
    throw new Error(`No router configured for chain ${chainId}`);
  }

  const client = getPublicClient(chainId);
  // viem's Log is a structural superset of OnChainLog; narrow at the boundary.
  const port: RecentDonationsClient = {
    getBlockNumber: () => client.getBlockNumber(),
    getLogs: (args) => client.getLogs(args) as Promise<readonly OnChainLog[]>,
  };

  return fetchRecentDonations(port, { routerAddress, limit });
}

// ---------------------------------------------------------------------------
// Client wrapper (thin glue: effect + state)
// ---------------------------------------------------------------------------

interface LiveReceiptStripProps {
  /** Active chain id. Defaults to Base Sepolia (the project default network). */
  chainId?: number;
  /** Max rows to show. */
  limit?: number;
  /** Loader override — defaults to the real on-chain reader. Injected in tests. */
  loader?: RecentDonationsLoader;
}

export function LiveReceiptStrip({
  chainId = baseSepolia.id,
  limit = DEFAULT_RECENT_LIMIT,
  loader = defaultLoadRecentDonations,
}: LiveReceiptStripProps) {
  const [status, setStatus] = useState<LiveReceiptStatus>({ kind: "loading" });

  useEffect(() => {
    // Starts in `loading` from useState; we intentionally do not re-set it
    // synchronously here (that would trigger a cascading render). On a dep
    // change the prior rows remain until the new load resolves.
    let active = true;

    loader({ chainId, limit })
      .then((donations) => {
        if (!active) return;
        // Zero rows collapses to the same honest state: a fresh deploy with an
        // empty window is indistinguishable from "no donations exist", so we
        // never imply one over the other.
        setStatus(
          donations.length > 0
            ? { kind: "ready", donations }
            : { kind: "unavailable" },
        );
      })
      .catch(() => {
        if (active) setStatus({ kind: "unavailable" });
      });

    return () => {
      active = false;
    };
  }, [chainId, limit, loader]);

  return <LiveReceiptStripView status={status} />;
}
