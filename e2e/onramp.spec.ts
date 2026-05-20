import { expect, test, type Page } from "@playwright/test";

/**
 * Epic 3, Phase 8 — on-ramp E2E.
 *
 * Scope: the donor-facing critical path — fill the checkout, submit, and get
 * handed off to Stripe's hosted on-ramp. Stripe is stubbed entirely at the
 * network layer (Playwright route interception), so this runs offline and
 * needs no Stripe credentials in the dev server.
 *
 * Deliberately OUT of scope here: the webhook → "settled" transition. That
 * boundary is signature-gated (`stripe.webhooks.constructEvent`) and is already
 * covered at the integration layer in
 *   - src/app/api/onramp/webhook/route.test.ts  (signature verify + dispatch)
 *   - src/lib/onramp/webhook-handler.test.ts     (pure state machine)
 * Forging a valid signature through a black-box browser test would either leak
 * the signing secret into the test process or bypass verification — both lower
 * the suite's trust to re-cover a line we already have. See the Phase 8 note in
 * prompts/epic-3-onramp-plan.md.
 */

const CHECKOUT_URL = "/donate/pcrf";
const SESSION_ENDPOINT = "**/api/onramp/session";

/** Sentinel host standing in for Stripe's hosted on-ramp; never hits the network. */
const STRIPE_REDIRECT_URL = "https://stripe-onramp.test/hosted/cos_e2e_123";
const STRIPE_HOST_GLOB = "https://stripe-onramp.test/**";

/** Fulfil the stubbed Stripe hosted page so the redirect resolves offline. */
async function stubStripeHostedPage(page: Page): Promise<void> {
  await page.route(STRIPE_HOST_GLOB, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html><body><h1>Stripe On-ramp (stub)</h1></body></html>",
    }),
  );
}

/**
 * Drive the form to a submittable state: $50 preset + a valid email.
 *
 * The preset click is retried until it "sticks" (the chip's `aria-pressed`
 * flips to `true`). Clicking a server-rendered button before Next.js hydration
 * wires its `onClick` silently no-ops — `toPass` reclicks until the handler is
 * live, which is the only reliable signal that hydration has completed.
 */
async function fillCheckout(page: Page): Promise<void> {
  await page.goto(CHECKOUT_URL);

  const fifty = page.getByRole("button", { name: /\$\s*50/ });
  await expect(fifty).toBeVisible();
  await expect(async () => {
    await fifty.click();
    await expect(fifty).toHaveAttribute("aria-pressed", "true");
  }).toPass({ timeout: 10_000 });

  await page.locator("input#donor-email").fill("donor@example.com");
}

test.describe(`${CHECKOUT_URL} on-ramp submit flow`, () => {
  test("submitting a valid donation redirects the donor to the Stripe hosted on-ramp", async ({
    page,
  }) => {
    let sessionRequestBody: unknown = null;

    await page.route(SESSION_ENDPOINT, async (route) => {
      sessionRequestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sessionId: "cos_e2e_123",
          redirectUrl: STRIPE_REDIRECT_URL,
        }),
      });
    });
    await stubStripeHostedPage(page);

    await fillCheckout(page);
    await page.getByRole("button", { name: /^Donate$/ }).click();

    // The donor lands on the (stubbed) Stripe hosted page.
    await page.waitForURL(/stripe-onramp\.test/);
    await expect(
      page.getByRole("heading", { name: /Stripe On-ramp \(stub\)/i }),
    ).toBeVisible();

    // The app POSTed the donor's checkout payload to the session route.
    expect(sessionRequestBody).toMatchObject({
      campaignId: "pcrf",
      grossCents: 5000,
      email: "donor@example.com",
    });
  });

  test("a provider error keeps the donor on the page with a visible error and no redirect", async ({
    page,
  }) => {
    await page.route(SESSION_ENDPOINT, (route) =>
      route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "provider_error",
            message: "Unable to create on-ramp session with the payment provider",
          },
        }),
      }),
    );
    await stubStripeHostedPage(page);

    await fillCheckout(page);
    await page.getByRole("button", { name: /^Donate$/ }).click();

    // CheckoutForm surfaces the error region; the donor never leaves /donate.
    // Scope to the error copy — `getByRole("alert")` alone also matches Next's
    // empty `__next-route-announcer__` live region.
    await expect(
      page.getByText(/We couldn.t complete your donation/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Unable to create on-ramp session/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/donate\/pcrf$/);
  });
});
