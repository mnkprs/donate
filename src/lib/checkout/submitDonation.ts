"use client";

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
  (options.redirect ?? browserRedirect)(redirectUrl);
}
