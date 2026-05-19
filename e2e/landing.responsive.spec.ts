import { expect, test } from "@playwright/test";

import { CAMPAIGNS } from "../src/lib/campaigns";

// Bound how far two cards' left edges can drift while still being "same column".
// Tailwind's `grid-cols-1` collapses every card onto x=0 (or the section padding
// inset), so anything > ~4px implies they slipped onto different columns.
const SAME_COLUMN_EPSILON = 4;

async function cardBoxes(page: import("@playwright/test").Page) {
  const cards = page.locator('section#causes a[href^="/donate/"]');
  await expect(cards).toHaveCount(CAMPAIGNS.length);
  const handles = await cards.all();
  const boxes = await Promise.all(handles.map((h) => h.boundingBox()));
  return boxes.map((b) => {
    if (!b) throw new Error("Campaign card has no bounding box");
    return b;
  });
}

function distinctColumns(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  let count = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] - sorted[i - 1] > SAME_COLUMN_EPSILON) count += 1;
  }
  return count;
}

test.describe("/ landing responsive grid", () => {
  test("hero and causes section are visible and within viewport", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
    await expect(page.locator("#causes")).toBeVisible();
    const causesBox = await page.locator("#causes").boundingBox();
    expect(causesBox).not.toBeNull();
    if (!causesBox) return;
    const viewport = page.viewportSize();
    if (viewport) {
      expect(causesBox.x).toBeGreaterThanOrEqual(0);
      expect(causesBox.x + causesBox.width).toBeLessThanOrEqual(viewport.width);
    }
  });

  test("CausesGrid collapses to 1 column on mobile (320)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "Mobile-only assertion",
    );
    await page.goto("/");
    const boxes = await cardBoxes(page);
    expect(distinctColumns(boxes.map((b) => b.x))).toBe(1);
  });

  test("CausesGrid expands to 2 columns at tablet (768)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-tablet",
      "Tablet-only assertion",
    );
    await page.goto("/");
    const boxes = await cardBoxes(page);
    expect(distinctColumns(boxes.map((b) => b.x))).toBe(2);
  });

  test("CausesGrid renders 3 columns at laptop/desktop (1024+)", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-laptop" &&
        testInfo.project.name !== "chromium-desktop",
      "Laptop/desktop-only assertion",
    );
    await page.goto("/");
    const boxes = await cardBoxes(page);
    expect(distinctColumns(boxes.map((b) => b.x))).toBe(3);
  });

  test("no horizontal scroll at any viewport", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
