import type { Stage } from "@/types/receipt";

export interface BuildStagesInput {
  donor: {
    /** Display-truncated donor EOA, e.g. "0xe0adb1…7a097bb". */
    addressShort: string;
    /** ETH amount sent by the donor (string-formatted), e.g. "0.0000627". */
    amountEth: string;
    /** Absolute timestamp of the donor tx, e.g. "17:34:01 UTC". */
    timestamp: string;
    /** Calendar date displayed on stage 1, e.g. "May 30, 2025". */
    date: string;
  };
  swap: {
    /** Display label of the AMM pool, e.g. "Uniswap V3 · 0.05% pool". */
    pool: string;
    /** USDC out from the swap, e.g. "1.001017". */
    amountUsdcOut: string;
    /** Human-readable swap rate, e.g. "1 ETH = 15,975 USDC". */
    rate: string;
    /** Absolute timestamp of the swap. */
    timestamp: string;
    /** Whole-second offset from stage 1 — used to render "+1s". */
    relativeSeconds: number;
  };
  routing: {
    /** Display-truncated OrgFundFactory address, e.g. "0x10fd…a589". */
    orgFundShort: string;
    /** USDC remaining after the Endaoment fee, e.g. "0.986017". */
    amountAfterFee: string;
    /** Endaoment protocol fee shown on hover. */
    endaomentFee: { amount: string; to: string };
    timestamp: string;
    relativeSeconds: number;
  };
  settlement: {
    /** Display-truncated charity fund address, e.g. "0x10e9…eb82". */
    charityAddrShort: string;
    /** Final fund label, e.g. "Black Women in Blockchain · Fund". */
    charityFundLabel: string;
    /** Final settled amount, e.g. "0.986017". */
    amountUsdc: string;
    /** Confirmation count with thousands separators. */
    confirmations: string;
    timestamp: string;
    relativeSeconds: number;
  };
  /** True only when a Philotimo platform fee was actually taken on-chain. */
  philotimoFeeActive: boolean;
}

const formatRelative = (seconds: number): string => `+${seconds}s`;

const donorDetail =
  "Donor signed and broadcast the tx from their wallet. No personal data is stored; only the wallet hash.";

const buildSwapDetail = (rate: string): string =>
  `Swapped on the Base ETH/USDC 0.05% pool. Slippage settled at $0.00; rate locked at ${rate}.`;

const routingDetail = (endaomentFeeAmount: string): string =>
  `OrgFundFactory routes donations to the recipient charity’s Endaoment fund based on its EIN. Endaoment’s 1.5% fee ($${endaomentFeeAmount}) is taken on-chain at this step.`;

const philotimoFutureDetail =
  "Future Philotimo donations will route through our 1% platform fee here. This receipt is for an existing Endaoment donation, so no Philotimo fee was charged.";

const philotimoActiveDetail =
  "Philotimo charges a 1% platform fee, taken on-chain in the same tx that routes the donation to Endaoment.";

const buildSettledDetail = (confirmations: string): string =>
  `${confirmations} confirmations. Final. The funds are spendable by the charity’s multisig.`;

export function buildStages(input: BuildStagesInput): Stage[] {
  const { donor, swap, routing, settlement, philotimoFeeActive } = input;

  const donated: Stage = {
    n: 1,
    title: "Donated",
    short: "Donor wallet sent funds",
    timestamp: donor.timestamp,
    relative: donor.date,
    amount: donor.amountEth,
    unit: "ETH",
    address: donor.addressShort,
    addressLabel: "From",
    detail: donorDetail,
    contract: "Wallet · EOA",
  };

  const converted: Stage = {
    n: 2,
    title: "Converted",
    short: "ETH → USDC via Uniswap V3",
    timestamp: swap.timestamp,
    relative: formatRelative(swap.relativeSeconds),
    amount: swap.amountUsdcOut,
    unit: "USDC",
    address: swap.pool,
    addressLabel: "Pool",
    detail: buildSwapDetail(swap.rate),
    contract: "Uniswap V3 Router",
  };

  const routed: Stage = {
    n: 3,
    title: "Routed",
    short: "Through Endaoment · 1.5% fee taken",
    timestamp: routing.timestamp,
    relative: formatRelative(routing.relativeSeconds),
    amount: routing.amountAfterFee,
    unit: "USDC",
    address: routing.orgFundShort,
    addressLabel: "Contract",
    detail: routingDetail(routing.endaomentFee.amount),
    contract: "Endaoment · OrgFundFactory",
    feeOnHover: {
      label: "Endaoment fee",
      amount: routing.endaomentFee.amount,
      to: routing.endaomentFee.to,
    },
  };

  const philotimoFee: Stage = philotimoFeeActive
    ? {
        n: 4,
        title: "Philotimo fee",
        short: "1% platform fee taken on-chain",
        timestamp: routing.timestamp,
        relative: formatRelative(routing.relativeSeconds),
        amount: "0.01",
        unit: "USDC",
        address: "Philotimo Treasury",
        addressLabel: "Treasury",
        detail: philotimoActiveDetail,
        contract: "Philotimo · Treasury",
      }
    : {
        n: 4,
        title: "Philotimo fee",
        short: "Future stage · not active for this tx",
        timestamp: "—",
        relative: "inactive",
        amount: "0.00",
        unit: "USDC",
        address: "Not yet deployed",
        addressLabel: "Status",
        detail: philotimoFutureDetail,
        contract: "Philotimo · Treasury (future)",
        inactive: true,
      };

  const settled: Stage = {
    n: 5,
    title: "Settled",
    short: "Arrived at charity address",
    timestamp: settlement.timestamp,
    relative: formatRelative(settlement.relativeSeconds),
    amount: settlement.amountUsdc,
    unit: "USDC",
    address: settlement.charityAddrShort,
    addressLabel: "Charity",
    detail: buildSettledDetail(settlement.confirmations),
    contract: settlement.charityFundLabel,
    terminal: true,
  };

  return [donated, converted, routed, philotimoFee, settled];
}
