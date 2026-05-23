import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { securityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // Apply baseline security headers to every route (security review L2).
  // CSP is intentionally deferred — see src/lib/security/headers.ts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders().map(({ key, value }) => ({ key, value })),
      },
    ];
  },
};

/**
 * Source-map upload is gated on `SENTRY_AUTH_TOKEN` (Epic 7, step 1B).
 *
 * Without a token — local dev, CI, and any preview build that hasn't been
 * granted Sentry credentials — uploading is disabled so `next build` succeeds
 * with NO Sentry env vars set. `org`/`project` come from env too, so nothing is
 * hardcoded and the build never tries to talk to Sentry when it shouldn't.
 * `silent` keeps the plugin quiet outside CI to avoid noisy build logs.
 */
const hasSentryAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Only upload source maps when a token is present; otherwise the build is a
  // no-op for Sentry tooling and stays green without credentials.
  sourcemaps: { disable: !hasSentryAuthToken },
  silent: !process.env.CI,
});
