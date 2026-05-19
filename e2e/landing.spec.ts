import { expect, test } from "@playwright/test";

import { CAMPAIGNS } from "../src/lib/campaigns";

test.describe("/ landing page", () => {
  test("renders the primary heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("primary navigation landmark is present", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();
  });

  test("each campaign card exposes a Donate link to /donate/[id]", async ({
    page,
  }) => {
    await page.goto("/");
    for (const campaign of CAMPAIGNS) {
      const link = page.locator(`a[href="/donate/${campaign.id}"]`).first();
      await expect(link).toBeVisible();
    }
  });

  test("clicking the first campaign Donate link navigates to /donate/[id]", async ({
    page,
  }) => {
    await page.goto("/");
    const first = CAMPAIGNS[0];
    const link = page.locator(`a[href="/donate/${first.id}"]`).first();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/donate/${first.id}$`));
  });

  test("does not preview Epic-6 receipt visuals in the hero", async ({
    page,
  }) => {
    await page.goto("/");
    // Canonical fake tx hash from designs/landing.jsx HeroReceiptMockup.
    await expect(page.locator("body")).not.toContainText("0xdc671195");
    // The example-receipt CTA must remain aria-disabled until Epic 6.
    const exampleCta = page.getByText("See an example receipt").first();
    await expect(exampleCta).toHaveAttribute("aria-disabled", "true");
  });
});
