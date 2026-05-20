/**
 * Thin Stripe Crypto Onramp client. The ONLY place that talks to Stripe over
 * the wire for session creation.
 *
 * Deliberately uses `fetch` rather than the `stripe` SDK: Crypto Onramp is a
 * separate beta surface not covered by the SDK's typed resources, and a raw
 * POST is trivially interceptable by MSW in tests. Env is injected (never read
 * from process.env here) so the wrapper stays unit-testable.
 */

import { z } from "zod";
import type { ServerEnv } from "@/lib/env/server";
import type {
  CreateSessionInput,
  OnrampSession,
  StripeOnrampRequest,
} from "@/types/onramp";
import { buildSessionRequest } from "./createSession";

export const STRIPE_ONRAMP_URL =
  "https://api.stripe.com/v1/crypto/onramp_sessions";

/** Abort the call if Stripe has not responded in this window. */
const STRIPE_TIMEOUT_MS = 10_000;

/** Cap how much of Stripe's error body we echo into a thrown message. */
const ERROR_BODY_MAX_CHARS = 300;

/** Only the fields Philotimo depends on; Stripe sends many more. */
const stripeOnrampResponseSchema = z.object({
  id: z.string().min(1),
  client_secret: z.string().min(1),
  redirect_url: z.string().url(),
});

/** Flatten the typed request into Stripe's bracket-encoded form body. */
function toFormBody(req: StripeOnrampRequest): URLSearchParams {
  return new URLSearchParams({
    "transaction_details[destination_currency]": req.destinationCurrency,
    "transaction_details[destination_network]": req.destinationNetwork,
    "transaction_details[destination_amount]": req.destinationAmount,
    "transaction_details[wallet_address]": req.destinationWalletAddress,
    "customer_information[email]": req.customerEmail,
    "metadata[campaign_id]": req.metadata.campaign_id,
  });
}

export async function createOnrampSession(
  input: CreateSessionInput,
  env: ServerEnv,
): Promise<OnrampSession> {
  // Validates input and throws before any network call.
  const request = buildSessionRequest(input, env);

  const response = await fetch(STRIPE_ONRAMP_URL, {
    method: "POST",
    signal: AbortSignal.timeout(STRIPE_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: toFormBody(request),
  });

  if (!response.ok) {
    // Stripe's error body carries the actionable detail (code, decline_code).
    // It never contains our secret, so it is safe to surface (truncated).
    const detail = (await response.text()).slice(0, ERROR_BODY_MAX_CHARS);
    throw new Error(
      `Stripe onramp session create failed: ${response.status} - ${detail}`,
    );
  }

  const parsed = stripeOnrampResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(
      "Unexpected Stripe onramp response: missing required fields",
    );
  }

  return {
    id: parsed.data.id,
    status: "created",
    clientSecret: parsed.data.client_secret,
    redirectUrl: parsed.data.redirect_url,
    grossCents: input.grossCents,
    campaignId: input.campaignId,
    donorEmail: input.email,
  };
}
