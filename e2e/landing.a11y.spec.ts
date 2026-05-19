import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("/ landing page accessibility", () => {
  test("has no serious or critical axe violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    expect(
      blocking,
      `Serious/critical a11y violations:\n${blocking
        .map(
          (v) =>
            `- [${v.impact}] ${v.id}: ${v.help}\n  ${v.nodes
              .map((n) => n.target.join(" "))
              .join("\n  ")}`,
        )
        .join("\n")}`,
    ).toEqual([]);
  });

  test("landmarks exist: nav (Primary), main, footer", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('nav[aria-label="Primary"]')).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.locator("footer")).toHaveCount(1);
  });
});
