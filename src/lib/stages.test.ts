import { describe, expect, it } from "vitest";
import { buildStages, type BuildStagesInput } from "./stages";

// Reference input matching the design fixture in designs/receipt.jsx:28-97.
// This is the canonical Endaoment-only receipt — no Eudaimonia fee was taken,
// so stage 4 must come out `inactive`.
const referenceInput: BuildStagesInput = {
  donor: {
    addressShort: "0xe0adb1…7a097bb",
    amountEth: "0.0000627",
    timestamp: "17:34:01 UTC",
    date: "May 30, 2025",
  },
  swap: {
    pool: "Uniswap V3 · 0.05% pool",
    amountUsdcOut: "1.001017",
    rate: "1 ETH = 15,975 USDC",
    timestamp: "17:34:02 UTC",
    relativeSeconds: 1,
  },
  routing: {
    orgFundShort: "0x10fd…a589",
    amountAfterFee: "0.986017",
    endaomentFee: { amount: "0.015", to: "0x5e8e…3b14" },
    timestamp: "17:34:04 UTC",
    relativeSeconds: 2,
  },
  settlement: {
    charityAddrShort: "0x10e9…eb82",
    charityFundLabel: "Black Women in Blockchain · Fund",
    amountUsdc: "0.986017",
    confirmations: "15,041,902",
    timestamp: "17:34:07 UTC",
    relativeSeconds: 3,
  },
  eudaimoniaFeeActive: false,
};

describe("buildStages", () => {
  it("returns exactly 5 stages in canonical order 1→5", () => {
    const stages = buildStages(referenceInput);
    expect(stages).toHaveLength(5);
    expect(stages.map((s) => s.n)).toEqual([1, 2, 3, 4, 5]);
    expect(stages.map((s) => s.title)).toEqual([
      "Donated",
      "Converted",
      "Routed",
      "Eudaimonia fee",
      "Settled",
    ]);
  });

  it("stage 1 (Donated) carries the donor EOA address and ETH amount", () => {
    const [donated] = buildStages(referenceInput);
    expect(donated).toMatchObject({
      n: 1,
      title: "Donated",
      amount: "0.0000627",
      unit: "ETH",
      address: "0xe0adb1…7a097bb",
      addressLabel: "From",
      timestamp: "17:34:01 UTC",
      relative: "May 30, 2025",
      contract: "Wallet · EOA",
    });
  });

  it("stage 2 (Converted) carries the Uniswap V3 pool label and USDC out", () => {
    const converted = buildStages(referenceInput)[1];
    expect(converted).toMatchObject({
      n: 2,
      title: "Converted",
      amount: "1.001017",
      unit: "USDC",
      address: "Uniswap V3 · 0.05% pool",
      addressLabel: "Pool",
      relative: "+1s",
      contract: "Uniswap V3 Router",
    });
  });

  it("stage 3 (Routed) carries Endaoment fee tooltip and orgFund address", () => {
    const routed = buildStages(referenceInput)[2];
    expect(routed).toMatchObject({
      n: 3,
      title: "Routed",
      amount: "0.986017",
      unit: "USDC",
      address: "0x10fd…a589",
      addressLabel: "Contract",
      relative: "+2s",
      contract: "Endaoment · OrgFundFactory",
    });
    expect(routed.feeOnHover).toEqual({
      label: "Endaoment fee",
      amount: "0.015",
      to: "0x5e8e…3b14",
    });
  });

  it("stage 4 (Eudaimonia fee) is INACTIVE when no platform fee was taken", () => {
    const eudaimoniaFee = buildStages(referenceInput)[3];
    expect(eudaimoniaFee.inactive).toBe(true);
    expect(eudaimoniaFee.amount).toBe("0.00");
    expect(eudaimoniaFee.timestamp).toBe("—");
    expect(eudaimoniaFee.address).toBe("Not yet deployed");
    expect(eudaimoniaFee.contract).toBe("Eudaimonia · Treasury (future)");
  });

  it("stage 5 (Settled) is TERMINAL and carries the final confirmation count", () => {
    const settled = buildStages(referenceInput)[4];
    expect(settled).toMatchObject({
      n: 5,
      title: "Settled",
      amount: "0.986017",
      unit: "USDC",
      address: "0x10e9…eb82",
      addressLabel: "Charity",
      relative: "+3s",
      contract: "Black Women in Blockchain · Fund",
    });
    expect(settled.terminal).toBe(true);
    expect(settled.detail).toContain("15,041,902 confirmations");
  });

  it("activates stage 4 when eudaimoniaFeeActive is true", () => {
    const stages = buildStages({ ...referenceInput, eudaimoniaFeeActive: true });
    expect(stages[3].inactive).toBeFalsy();
  });
});
