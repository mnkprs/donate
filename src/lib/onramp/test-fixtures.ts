/**
 * Shared fixtures for the on-ramp unit tests. Kept in one place so a future
 * ServerEnv schema change only needs a single update. Not a test suite itself
 * (no `.test.ts` suffix) and excluded from coverage in vitest.config.ts.
 */

import type { ServerEnv } from "@/lib/env/server";
import type { CreateSessionInput } from "@/types/onramp";

export const TEST_ENV: ServerEnv = Object.freeze({
  STRIPE_SECRET_KEY: "sk_test_abcdef1234567890",
  STRIPE_ONRAMP_WEBHOOK_SECRET: "whsec_abcdef1234567890",
  KV_REST_API_URL: "https://example-kv.upstash.io",
  KV_REST_API_TOKEN: "kv_token_abcdef1234567890",
  ROUTER_ADDRESS_BASE_SEPOLIA: "0x1234567890aBcDeF1234567890AbCdEf12345678",
  USDC_CONTRACT_BASE_SEPOLIA: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  NEXT_PUBLIC_CHAIN: "base-sepolia",
});

export const VALID_INPUT: CreateSessionInput = Object.freeze({
  campaignId: "pcrf",
  grossCents: 5000,
  email: "donor@example.com",
});

/** Realistic minimal Stripe Crypto Onramp session-create success response. */
export const STRIPE_OK = Object.freeze({
  id: "cos_test_123",
  object: "crypto.onramp_session",
  client_secret: "cos_test_123_secret_abc",
  livemode: false,
  status: "initialized",
  redirect_url: "https://crypto.link.com/session/cos_test_123",
});
