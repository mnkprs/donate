import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

/**
 * MSW server with zero default handlers.
 *
 * `onUnhandledRequest: "error"` is the contract: any outbound HTTP from a unit
 * test must be either explicitly handled (per-test `server.use(http.get(...))`)
 * or it fails the test. Prevents accidental real calls to Stripe, KV, or any
 * other third party during CI.
 */
export const mswServer = setupServer();

beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  mswServer.resetHandlers();
});

afterAll(() => {
  mswServer.close();
});
