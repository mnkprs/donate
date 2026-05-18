/**
 * Demo fixtures used during the design port phase, before the route loader
 * is wired up to live chain data. Mirrors `designs/receipt.jsx:5-97`.
 */
import type { ReceiptBundle, ReceiptData } from "@/types/receipt";

export const RECEIPT_FIXTURE: ReceiptData = {
  donorShort: "0xe0adb1…7a097bb",
  charity: "Black Women in Blockchain Inc",
  ein: "87-1055621",
  mission:
    "Building economic mobility for Black women through blockchain literacy, fellowship, and on-chain career pathways.",
  amount: "1.00",
  amountUsdc: "1.001017",
  date: "May 30, 2025",
  time: "5:34 PM UTC",
  network: "Base",
  txid: "0xdc671195100031cab810c6c9ad6da7a1e43212f2bb3b0d9c0ece38ac0e7a78ed",
  txidShort: "0xdc67…78ed",
  block: "30,918,548",
  confirmations: "15,041,902",
  ethIn: "0.0000627",
  rate: "1 ETH = 15,975 USDC",
  platformFee: "0.00",
  endaomentFee: "0.015",
  orgFund: "0x10fd…a589",
  charityAddr: "0x10e9…eb82",
  donorFee: "0.00",
};

export const RECEIPT_BUNDLE_FIXTURE: ReceiptBundle = {
  data: RECEIPT_FIXTURE,
  stages: [
    {
      n: 1,
      title: "Donated",
      short: "Donor wallet sent funds",
      timestamp: "17:34:01 UTC",
      relative: "May 30, 2025",
      amount: RECEIPT_FIXTURE.ethIn,
      unit: "ETH",
      address: RECEIPT_FIXTURE.donorShort,
      addressLabel: "From",
      detail:
        "Donor signed and broadcast the tx from their wallet. No personal data is stored; only the wallet hash.",
      contract: "Wallet · EOA",
    },
    {
      n: 2,
      title: "Converted",
      short: "ETH → USDC via Uniswap V3",
      timestamp: "17:34:02 UTC",
      relative: "+1s",
      amount: RECEIPT_FIXTURE.amountUsdc,
      unit: "USDC",
      address: "Uniswap V3 · 0.05% pool",
      addressLabel: "Pool",
      detail:
        "Swapped on the Base ETH/USDC 0.05% pool. Slippage settled at $0.00; rate locked at 1 ETH = 15,975 USDC.",
      contract: "Uniswap V3 Router",
    },
    {
      n: 3,
      title: "Routed",
      short: "Through Endaoment · 1.5% fee taken",
      timestamp: "17:34:04 UTC",
      relative: "+2s",
      amount: "0.986017",
      unit: "USDC",
      address: RECEIPT_FIXTURE.orgFund,
      addressLabel: "Contract",
      detail:
        "OrgFundFactory routes donations to the recipient charity's Endaoment fund based on its EIN. Endaoment's 1.5% fee ($0.015) is taken on-chain at this step.",
      contract: "Endaoment · OrgFundFactory",
      feeOnHover: {
        label: "Endaoment fee",
        amount: RECEIPT_FIXTURE.endaomentFee,
        to: "0x5e8e…3b14",
      },
    },
    {
      n: 4,
      title: "Philotimo fee",
      short: "Future stage · not active for this tx",
      timestamp: "—",
      relative: "inactive",
      amount: "0.00",
      unit: "USDC",
      address: "Not yet deployed",
      addressLabel: "Status",
      detail:
        "Future Philotimo donations will route through our 1% platform fee here. This receipt is for an existing Endaoment donation, so no Philotimo fee was charged.",
      contract: "Philotimo · Treasury (future)",
      inactive: true,
    },
    {
      n: 5,
      title: "Settled",
      short: "Arrived at charity address",
      timestamp: "17:34:07 UTC",
      relative: "+3s",
      amount: "0.986017",
      unit: "USDC",
      address: RECEIPT_FIXTURE.charityAddr,
      addressLabel: "Charity",
      detail:
        "15,041,902 confirmations. Final. The funds are spendable by the charity's multisig.",
      contract: "Black Women in Blockchain · Fund",
      terminal: true,
    },
  ],
};
