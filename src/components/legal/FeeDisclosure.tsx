import { EUDAIMONIA_FEE_BPS } from "@/lib/checkout/fees";

/**
 * Format a basis-points value as a percentage string with two decimals.
 * 100 bps → "1.00%". Kept tiny and local so the disclosed fee is always
 * computed from the same constant the checkout math uses.
 */
export function formatBpsAsPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/** The Eudaimonia platform fee, formatted for display (e.g. "1.00%"). */
export const EUDAIMONIA_FEE_PERCENT = formatBpsAsPercent(EUDAIMONIA_FEE_BPS);

interface FeeDisclosureProps {
  /**
   * When true, render the compact inline variant suitable for embedding in a
   * checkout summary. Defaults to the standalone card used on legal pages.
   */
  readonly compact?: boolean;
}

/**
 * Single source of truth for the donor-facing platform-fee statement. The
 * percentage is derived from {@link EUDAIMONIA_FEE_BPS} so the disclosed fee
 * can never drift from the value the checkout actually charges.
 */
export function FeeDisclosure({ compact = false }: FeeDisclosureProps) {
  const feeStatement = (
    <>
      Eudaimonia charges a flat{" "}
      <span
        className="font-medium text-ink"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {EUDAIMONIA_FEE_PERCENT}
      </span>{" "}
      platform fee.
    </>
  );

  if (compact) {
    return (
      <p className="text-xs leading-[1.6] text-mute" data-testid="fee-disclosure">
        {feeStatement} It is taken on-chain and itemized in your receipt before
        funds reach Endaoment.
      </p>
    );
  }

  return (
    <aside
      data-testid="fee-disclosure"
      aria-label="Platform fee disclosure"
      className="rounded-xl border border-rule bg-tint p-6"
    >
      <h2 className="text-base font-medium tracking-[-0.2px] text-ink">
        Platform fee
      </h2>
      <p className="mt-2 text-sm leading-[1.6] text-mute">
        {feeStatement} This fee is deducted on-chain from your gross donation
        and itemized in your receipt before the remaining funds are routed to
        the Endaoment Org Fund. Endaoment&apos;s own charitable-infrastructure
        fee and card-processing fees are disclosed separately at checkout.
      </p>
    </aside>
  );
}
