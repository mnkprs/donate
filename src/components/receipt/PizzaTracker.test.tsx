import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { PizzaTracker } from "@/components/receipt/PizzaTracker";
import type { Stage } from "@/types/receipt";

const fixtureStages: Stage[] = [
  {
    n: 1,
    title: "Donated",
    short: "Donor sent ETH on Base.",
    timestamp: "17:34:01 UTC",
    relative: "+0s",
    amount: "0.0000627",
    unit: "ETH",
    address: "0xe0adb1…7a097bb",
    addressLabel: "From wallet",
    detail: "Original donor wallet.",
    contract: "EOA",
  },
  {
    n: 2,
    title: "Converted",
    short: "Swap to USDC on a Base AMM.",
    timestamp: "17:34:02 UTC",
    relative: "+1s",
    amount: "1.001017",
    unit: "USDC",
    address: "Uniswap v3 · 0.05%",
    addressLabel: "Liquidity pool",
    detail: "ETH→USDC swap.",
    contract: "Uniswap v3",
    feeOnHover: {
      label: "AMM swap fee",
      amount: "0.0015",
      to: "Uniswap LPs",
    },
  },
  {
    n: 3,
    title: "Routed",
    short: "USDC entered the Endaoment fund.",
    timestamp: "17:34:03 UTC",
    relative: "+2s",
    amount: "1.001017",
    unit: "USDC",
    address: "0xorg…fund",
    addressLabel: "OrgFundFactory",
    detail: "Endaoment OrgFundFactory.",
    contract: "Endaoment · OrgFundFactory",
  },
  {
    n: 4,
    title: "Philotimo fee",
    short: "Platform fee held on routing.",
    timestamp: "—",
    relative: "—",
    amount: "0.00",
    unit: "USDC",
    address: "—",
    addressLabel: "Treasury",
    detail: "Future platform fee.",
    contract: "Philotimo Treasury",
    inactive: true,
  },
  {
    n: 5,
    title: "Settled",
    short: "Funds delivered to charity multisig.",
    timestamp: "17:34:06 UTC",
    relative: "+5s",
    amount: "1.001017",
    unit: "USDC",
    address: "0xchar…fund",
    addressLabel: "Charity multisig",
    detail: "Final settlement.",
    contract: "Charity Safe",
    terminal: true,
  },
];

describe("PizzaTracker", () => {
  test("renders the section heading copy", () => {
    const html = renderToString(<PizzaTracker stages={fixtureStages} />);
    expect(html).toContain("The path");
    expect(html).toContain("Where the dollar went, step by step.");
  });

  test("renders every stage title and zero-padded ordinal", () => {
    const html = renderToString(<PizzaTracker stages={fixtureStages} />);
    for (const stage of fixtureStages) {
      expect(html).toContain(stage.title);
      expect(html).toContain(`0${stage.n}`);
    }
  });

  test("renders stage amounts with unit labels for active stages", () => {
    const html = renderToString(<PizzaTracker stages={fixtureStages} />);
    expect(html).toContain("0.0000627");
    expect(html).toContain("ETH");
    expect(html).toContain("1.001017");
    expect(html).toContain("USDC");
  });

  test("renders the inactive copy and FUTURE chip for inactive stages", () => {
    const html = renderToString(<PizzaTracker stages={fixtureStages} />);
    expect(html).toContain("Future");
    expect(html).toContain("no Philotimo fee was charged");
  });

  test("omits the value block for inactive stages (no amount line shown)", () => {
    const inactiveOnly: Stage[] = [
      { ...fixtureStages[3], amount: "999.999", inactive: true },
    ];
    const html = renderToString(<PizzaTracker stages={inactiveOnly} />);
    expect(html).not.toContain("999.999");
  });

  test("renders Verify link for each non-inactive stage", () => {
    const html = renderToString(<PizzaTracker stages={fixtureStages} />);
    const verifyMatches = html.match(/Verify ↗/g) ?? [];
    // 4 active stages out of 5 (one inactive)
    expect(verifyMatches.length).toBe(4);
  });

  test("supports minimal variant (no card borders/background)", () => {
    const cardHtml = renderToString(
      <PizzaTracker stages={fixtureStages} variant="card" />,
    );
    const minimalHtml = renderToString(
      <PizzaTracker stages={fixtureStages} variant="minimal" />,
    );
    // Card variant uses a hairline border color somewhere in inline style.
    expect(cardHtml).toContain("#eef2f6");
    // Minimal variant should not render those card borders.
    expect(minimalHtml).not.toContain("#eef2f6");
  });
});
