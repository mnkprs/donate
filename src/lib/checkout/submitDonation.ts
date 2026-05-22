"use client";

import { amountBucket, trackOnrampStarted } from "@/lib/analytics/events";
import { realSubmit } from "@/lib/checkout/realSubmit";
import type { CheckoutPayload } from "@/types/checkout";

/** Default browser navigation. Isolated so tests can inject a spy (node has no `window`). */
function browserRedirect(url: string): void {
  window.location.assign(url);
}

export interface SubmitDonationOptions {
  /**
   * How to send the donor onward once a session exists. Defaults to a real
   * `window.location.assign`; tests inject a spy to assert the target URL
   * without a live navigation.
   */
  readonly redirect?: (url: string) => void;
}

/**
 * The adapter `page.tsx` hands to `CheckoutForm.onSubmit`. It bridges
 * `realSubmit` (which RETURNS `{ redirectUrl }`) to the form's
 * `(payload) => Promise<void>` seam: create the session, then navigate the
 * donor to Stripe's hosted on-ramp.
 *
 * On failure it lets the `OnrampError` propagate unchanged — `CheckoutForm`'s
 * catch branch surfaces the message and the donor stays put (no redirect),
 * which is exactly why the redirect happens only after a resolved `realSubmit`.
 */
export async function submitDonation(
  payload: CheckoutPayload,
  options: SubmitDonationOptions = {},
): Promise<void> {
  const { redirectUrl } = await realSubmit(payload);
  // Success-only funnel: a resolved session means the donor is committing to
  // the onramp and is about to leave for Stripe. Failed submits never fire.
  // PII-free: campaign slug + coarse amount bucket only, never the raw amount.
  trackOnrampStarted(payload.campaignId, amountBucket(payload.grossCents));
  (options.redirect ?? browserRedirect)(redirectUrl);
}
