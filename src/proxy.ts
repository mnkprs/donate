/**
 * Per-request Content-Security-Policy with a fresh nonce (Epic 7, step 1D).
 *
 * Follows the official Next.js App Router CSP-with-nonce pattern: this proxy
 * generates a unique nonce per request, sets the `Content-Security-Policy` on BOTH
 * the forwarded request headers and the response, and passes the nonce through the
 * `x-nonce` request header. Next.js reads the `'nonce-…'` token from the CSP header
 * during SSR and injects the same nonce into its own framework/bundle scripts.
 *
 * File convention: Next 16 renamed the `middleware.ts` convention to `proxy.ts`;
 * the framework's automatic nonce injection runs under the `proxy` convention, so
 * this file MUST be named `proxy.ts` and export `proxy` for the nonce to reach
 * Next's inline bootstrap scripts (verified live — `middleware.ts` did not inject).
 *
 * The host allowlist lives in `buildCsp` (src/lib/security/headers.ts) so it stays
 * unit-testable and audited; this file only generates the nonce and wires headers.
 *
 * Runtime note: the proxy runs on the Edge runtime, where Node's `Buffer` is
 * unavailable — the nonce is built from Web Crypto (`crypto.getRandomValues`).
 *
 * The static security headers (HSTS, X-CTO, X-Frame, Referrer, Permissions) are
 * still applied by `next.config.ts` `headers()`; this proxy only adds CSP.
 *
 * Dynamic-rendering requirement: Next injects this per-request nonce into its own
 * inline bootstrap scripts ONLY when a route renders dynamically. A statically
 * prerendered route bakes those scripts at build time with no nonce, so the
 * runtime nonce can never match and the browser blocks them. Dynamic routes
 * (receipt, donate, processing, API) satisfy this automatically; the landing
 * page opts in via `export const dynamic = "force-dynamic"` (src/app/page.tsx).
 * The remaining static routes (legal pages) still receive the CSP header; if any
 * are later given client interactivity, they should opt into dynamic rendering
 * the same way.
 */

import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/security/headers";

/** Bytes of entropy in the nonce (128 bits). */
const NONCE_BYTE_LENGTH = 16;

/** Generate an opaque, URL-safe nonce using Web Crypto (Edge-runtime safe). */
function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTE_LENGTH));
  // base64 via btoa (available in Edge runtime); a CSP nonce only needs to be an
  // opaque, single-use token, so any stable encoding of the random bytes works.
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function proxy(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Forward the nonce + CSP on the request so Next can apply the nonce to its
  // own SSR-injected scripts during rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Enforce the policy in the browser via the response header too.
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  /**
   * Apply to all routes EXCEPT static assets and image optimization, which serve
   * no inline scripts and keep their existing static security headers. Excluding
   * them avoids forcing dynamic rendering of immutable static files.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
