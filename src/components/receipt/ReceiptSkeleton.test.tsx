import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { ReceiptSkeleton } from "@/components/receipt/ReceiptSkeleton";

describe("ReceiptSkeleton", () => {
  test("renders exactly 5 shimmer stage placeholders", () => {
    const html = renderToString(<ReceiptSkeleton />);
    const matches = html.match(/data-testid="receipt-skeleton-stage"/g) ?? [];
    expect(matches).toHaveLength(5);
  });

  test("renders a charity card placeholder", () => {
    const html = renderToString(<ReceiptSkeleton />);
    expect(html).toContain('data-testid="receipt-skeleton-charity"');
  });

  test("renders a verification card placeholder", () => {
    const html = renderToString(<ReceiptSkeleton />);
    expect(html).toContain('data-testid="receipt-skeleton-verification"');
  });

  test("contains no spinner role element", () => {
    const html = renderToString(<ReceiptSkeleton />);
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('role="progressbar"');
  });

  test("each stage placeholder carries the shimmer animation marker", () => {
    const html = renderToString(<ReceiptSkeleton />);
    // Verify the euda-skel animation class is wired to each stage card.
    // We assert the animation string appears at least 5 times (once per stage).
    const animMatches = html.match(/euda-skel/g) ?? [];
    expect(animMatches.length).toBeGreaterThanOrEqual(5);
  });

  test("stage placeholders carry data-euda-motion for prefers-reduced-motion suppression", () => {
    const html = renderToString(<ReceiptSkeleton />);
    const motionMatches = html.match(/data-euda-motion/g) ?? [];
    // At minimum one per stage (5 stages)
    expect(motionMatches.length).toBeGreaterThanOrEqual(5);
  });
});
