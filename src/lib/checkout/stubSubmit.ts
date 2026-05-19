"use client";

import type { CheckoutPayload } from "@/types/checkout";

const STUB_SUBMIT_MESSAGE =
  "Donations aren't wired to the on-ramp yet — Epic 3 will connect Stripe and the routing contract.";

/**
 * Stand-in for the real Stripe/Endaoment on-ramp submission used until Epic 3
 * ships. Always rejects with a known Error so CheckoutForm's catch branch can
 * surface the top-level error region in tests and demo dogfooding.
 *
 * Marked "use client" so the server-rendered donate page can import it and
 * pass it as a client reference to the "use client" CheckoutForm component.
 */
export async function stubSubmit(_payload: CheckoutPayload): Promise<void> {
  throw new Error(STUB_SUBMIT_MESSAGE);
}
