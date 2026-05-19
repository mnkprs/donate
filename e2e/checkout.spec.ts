import { expect, test } from "@playwright/test";

const CAMPAIGN_ID = "pcrf";
const CHECKOUT_URL = `/donate/${CAMPAIGN_ID}`;

test.describe(`${CHECKOUT_URL} checkout flow`, () => {
  test("renders CampaignSummary and AmountSelector on load", async ({
    page,
  }) => {
    await page.goto(CHECKOUT_URL);

    // CampaignSummary anchor — campaign name comes from CAMPAIGNS["pcrf"].
    await expect(
      page.getByText(/Palestine Children'?s Relief/i).first(),
    ).toBeVisible();

    // AmountSelector field label is the only stable visible anchor for the
    // donation-amount block; the chips and Custom toggle live underneath it.
    await expect(
      page.getByText(/Donation amount/i).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Custom" })).toBeVisible();
  });

  test("selecting $50 preset populates the order summary with Net to charity", async ({
    page,
  }) => {
    await page.goto(CHECKOUT_URL);

    await page.getByRole("button", { name: /\$\s*50/ }).click();

    const summary = page.locator('aside[aria-label="Order summary"]');
    await expect(summary).toBeVisible();
    // Sanity-check that the breakdown rendered (not the empty-state copy).
    await expect(summary).not.toContainText(
      /Enter an amount to see the breakdown/i,
    );
    await expect(summary).toContainText(/Net to charity/i);
    await expect(summary).toContainText(/Philotimo routing fee/i);
    // Net row carries a tabular-numeral dollar amount; assert the format only.
    await expect(summary).toContainText(/\$\d+\.\d{2}/);
  });

  test("custom amount of $0 keeps the submit CTA disabled", async ({
    page,
  }) => {
    await page.goto(CHECKOUT_URL);

    await page.getByRole("button", { name: "Custom" }).click();
    // Custom input opens prefilled with empty/zero; type "0" explicitly.
    const customInput = page.locator("input[inputmode='decimal']");
    await customInput.fill("0");

    const submit = page.getByRole("button", { name: /^Donate$/ });
    await expect(submit).toBeDisabled();
  });

  test("invalid email surfaces the email error on submit attempt", async ({
    page,
  }) => {
    await page.goto(CHECKOUT_URL);

    // Pick a valid amount so the submit gate falls on the email.
    await page.getByRole("button", { name: /\$\s*50/ }).click();

    const emailInput = page.locator("input#donor-email");
    await emailInput.fill("not-an-email");

    // Click submit; CheckoutForm dispatches SUBMIT_ATTEMPT which exposes the
    // email error region.
    await page.getByRole("button", { name: /^Donate$/ }).click();

    await expect(
      page.getByText(/valid email/i).first(),
    ).toBeVisible();
  });

  test("page has no horizontal overflow at the current viewport", async ({
    page,
  }) => {
    await page.goto(CHECKOUT_URL);

    // Wait for any client hydration that might shift layout.
    await page.waitForLoadState("networkidle");

    const { scroll, client } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));

    // Allow 1px of subpixel slack — anti-aliasing sometimes pushes scrollWidth
    // by a fractional pixel that rounds up.
    expect(scroll, `scrollWidth=${scroll} clientWidth=${client}`).toBeLessThanOrEqual(
      client + 1,
    );
  });
});
