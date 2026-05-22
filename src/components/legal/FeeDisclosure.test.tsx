import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  EUDAIMONIA_FEE_PERCENT,
  FeeDisclosure,
  formatBpsAsPercent,
} from "@/components/legal/FeeDisclosure";
import { EUDAIMONIA_FEE_BPS } from "@/lib/checkout/fees";

describe("formatBpsAsPercent", () => {
  test("formats basis points as a two-decimal percentage", () => {
    expect(formatBpsAsPercent(100)).toBe("1.00%");
    expect(formatBpsAsPercent(150)).toBe("1.50%");
    expect(formatBpsAsPercent(250)).toBe("2.50%");
  });

  test("EUDAIMONIA_FEE_PERCENT derives from the fees.ts constant", () => {
    expect(EUDAIMONIA_FEE_PERCENT).toBe(formatBpsAsPercent(EUDAIMONIA_FEE_BPS));
  });
});

describe("FeeDisclosure", () => {
  test("renders the fee value sourced from EUDAIMONIA_FEE_BPS", () => {
    const html = renderToString(<FeeDisclosure />);
    const expectedPercent = formatBpsAsPercent(EUDAIMONIA_FEE_BPS);
    expect(html).toContain(expectedPercent);
  });

  test("exposes a stable test hook", () => {
    const html = renderToString(<FeeDisclosure />);
    expect(html).toContain('data-testid="fee-disclosure"');
  });

  test("compact variant also shows the fee from fees.ts", () => {
    const html = renderToString(<FeeDisclosure compact />);
    expect(html).toContain(formatBpsAsPercent(EUDAIMONIA_FEE_BPS));
  });
});
