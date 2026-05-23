"use client";

import { usePathname } from "next/navigation";

import {
  ErrorScreen,
  type ErrorVariant,
} from "@/components/boundary/ErrorScreen";

/**
 * Route-level error boundary for the App Router.
 *
 * Next renders this when a server component or client hook throws inside
 * any route segment. Props are `error` (with optional `digest`) + `reset`
 * (rerun the segment). Must be a Client Component per Next.js convention.
 *
 * We choose the screen variant from the current pathname so the donor
 * sees context-aware "what you were doing" copy. For the processing
 * variant we also recover the session id from the URL so the resume CTA
 * deep-links straight back into `/status/[sessionId]`.
 */

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalRouteError({ error, reset }: ErrorPageProps) {
  const pathname = usePathname() ?? "";
  const { variant, recoveredSessionId } = inferVariant(pathname);

  return (
    <ErrorScreen
      variant={variant}
      reset={reset}
      errorDigest={error.digest}
      recoveredSessionId={recoveredSessionId}
    />
  );
}

/**
 * Map the failing route to one of the four `ErrorVariant`s. Returns the
 * recovered session id when the pathname matches `/processing/[sessionId]`
 * so the resume CTA gets a valid deep-link.
 */
function inferVariant(pathname: string): {
  variant: ErrorVariant;
  recoveredSessionId?: string;
} {
  if (pathname.startsWith("/donate/")) {
    return { variant: "checkout_render_error" };
  }

  if (pathname.startsWith("/processing/")) {
    const sessionId = pathname.split("/")[2];
    return {
      variant: "processing_render_error",
      ...(sessionId ? { recoveredSessionId: sessionId } : {}),
    };
  }

  if (pathname.startsWith("/receipt/")) {
    return { variant: "receipt_render_error" };
  }

  return { variant: "route_render_error" };
}
