import type { NextConfig } from "next";
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

export default nextConfig;
