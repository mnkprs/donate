/**
 * Shared idempotency constants for the on-ramp session API.
 *
 * Lives in its own dependency-free module so BOTH sides of the wire can import
 * the same source of truth without coupling:
 *   - the server route (`src/app/api/onramp/session/route.ts`) reads the header,
 *   - the client submit (`src/lib/checkout/realSubmit.ts`) sets it.
 *
 * Crucially this module imports nothing server-only (no `node:crypto`, no env
 * loader), so the `"use client"` submit path can import it without dragging
 * server code into the browser bundle.
 */

/**
 * Client-supplied idempotency key header. A retry carrying the same key AND the
 * same payload is a no-op on the server (returns the cached session); a
 * mismatched payload under a reused key is rejected. See the route handler for
 * the full contract.
 */
export const CLIENT_REQUEST_ID_HEADER = "x-client-request-id";
