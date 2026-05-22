/**
 * Baseline HTTP security headers applied to every response (security review L2).
 *
 * Scope decision: this pass ships only egress-independent headers. A Content-
 * Security-Policy is deliberately NOT included yet — a correct `connect-src`
 * must enumerate the env-driven Base RPC host (`NEXT_PUBLIC_BASE_RPC_URL`) and
 * the Stripe redirect host, and an omission silently breaks wallet RPC calls in
 * production. CSP is deferred to a follow-up once network egress is audited with
 * the donate page actually loaded. The headers below depend on no origins and
 * cannot break the app, so they are safe to apply unconditionally.
 *
 * Consumed by `next.config.ts` `headers()`, which applies them to all routes.
 */

export interface SecurityHeader {
  readonly key: string;
  readonly value: string;
}

/** Two years; the duration the HSTS preload list expects. */
const HSTS_MAX_AGE_SECONDS = 63_072_000;

export const SECURITY_HEADERS: readonly SecurityHeader[] = [
  // Force HTTPS for this host + subdomains; `preload` opts into browser presets.
  {
    key: "Strict-Transport-Security",
    value: `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains; preload`,
  },
  // Refuse to reinterpret a response as a different MIME type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // No framing anywhere — the donate flow is never meant to be embedded.
  { key: "X-Frame-Options", value: "DENY" },
  // Send origin (not full path/query) on cross-origin navigations.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop access to powerful device features the app never uses.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
] as const;

/** The header list to spread into a Next.js route header descriptor. */
export function securityHeaders(): readonly SecurityHeader[] {
  return SECURITY_HEADERS;
}
