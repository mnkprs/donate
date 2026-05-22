import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { LiveTracker } from "@/components/receipt/LiveTracker";
import { buildLiveStages } from "@/lib/onramp/live-stages";

const inflight = buildLiveStages({ currentStage: 2, grossCents: 500 });

describe("LiveTracker — in-flight (stage 2 active)", () => {
  test("renders all five stage titles", () => {
    const html = renderToString(<LiveTracker stages={inflight} />);
    for (const title of [
      "Paid",
      "Converted",
      "Routed",
      "Delivered",
      "Published",
    ]) {
      expect(html).toContain(title);
    }
  });

  test("done stage shows a Verify link", () => {
    const html = renderToString(<LiveTracker stages={inflight} />);
    expect(html).toContain("Verify");
  });

  test("active stage shows the pending counter copy", () => {
    const html = renderToString(<LiveTracker stages={inflight} />);
    expect(html).toContain("Pending");
  });

  test("queued stage shows the waiting copy", () => {
    const html = renderToString(<LiveTracker stages={inflight} />);
    expect(html).toContain("Waits for the previous step to settle on-chain.");
  });

  test("renders the per-state status pills", () => {
    const html = renderToString(<LiveTracker stages={inflight} />);
    expect(html).toContain("In progress");
    expect(html).toContain("Done");
    expect(html).toContain("Queued");
  });
});

describe("LiveTracker — failed", () => {
  test("shows the supplied failure reason on the failed stage", () => {
    const stages = buildLiveStages({
      currentStage: 2,
      failedAt: 3,
      grossCents: 500,
      failureReason: "Conversion timed out.",
    });
    const html = renderToString(<LiveTracker stages={stages} />);
    expect(html).toContain("Failed");
    expect(html).toContain("Conversion timed out.");
  });

  test("falls back to default copy when no reason is given", () => {
    const stages = buildLiveStages({
      currentStage: 2,
      failedAt: 3,
      grossCents: 500,
    });
    const html = renderToString(<LiveTracker stages={stages} />);
    expect(html).toContain("This step did not complete.");
  });
});
