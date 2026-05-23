"use client";

import { useEffect, useRef } from "react";

import {
  trackDonateIntent,
  trackLandingView,
  trackReceiptViewed,
} from "@/lib/analytics/events";

/**
 * Serializable descriptor of a one-shot "view" event. A server component can
 * pass this across the server→client boundary (plain data only — no function
 * props, which Next.js forbids), and the client resolves it to the matching
 * PII-safe emitter from `@/lib/analytics/events`.
 */
type ViewEvent =
  | { readonly name: "landing_view" }
  | { readonly name: "receipt_viewed" }
  | { readonly name: "donate_intent"; readonly campaignId: string };

interface TrackMountProps {
  /** Which view event to emit once on mount. Plain data, so it serializes. */
  event: ViewEvent;
}

function emit(event: ViewEvent): void {
  switch (event.name) {
    case "landing_view":
      trackLandingView();
      return;
    case "receipt_viewed":
      trackReceiptViewed();
      return;
    case "donate_intent":
      trackDonateIntent(event.campaignId);
      return;
  }
}

/**
 * Renderless client helper that lets a server component emit a one-shot view
 * analytics event on mount. The ref guard makes it idempotent across React
 * StrictMode's development double-invoke and any parent re-render, so a single
 * page view never emits duplicate funnel events.
 *
 * It owns no PII: the event payloads are built by the emitters in
 * `@/lib/analytics/events`, where the privacy contract lives.
 */
export function TrackMount({ event }: TrackMountProps): null {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    emit(event);
    // `event` is plain data rebuilt each render; the ref guard — not the dep
    // array — enforces the single fire, so we intentionally run on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
