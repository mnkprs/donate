/**
 * Client-side fetch helper for the on-ramp status route (Epic 5, Screen 1).
 *
 * The processing screen polls this from the browser via React Query. Kept tiny
 * and dependency-free; the URL is relative so it resolves against the current
 * origin. Throws on a non-OK response so React Query surfaces the error /
 * retries rather than treating an error body as valid status.
 */
import type { OnrampStatusResponse } from "@/types/onramp";

export async function fetchOnrampStatus(
  sessionId: string,
): Promise<OnrampStatusResponse> {
  const res = await fetch(
    `/api/onramp/status/${encodeURIComponent(sessionId)}`,
    { headers: { accept: "application/json" } },
  );
  if (!res.ok) {
    throw new Error(`On-ramp status request failed: ${res.status}`);
  }
  return (await res.json()) as OnrampStatusResponse;
}
