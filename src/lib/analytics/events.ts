import { track } from "@vercel/analytics";

/**
 * Privacy-respecting product analytics for the donation funnel.
 *
 * Backed by Vercel Analytics (cookieless, no fingerprinting). This module is
 * the single chokepoint for every funnel event so the PII contract is enforced
 * in ONE place: event names are a closed union, and the prop shapes below are
 * intentionally narrow. We never attach donor email, name, Stripe session id,
 * wallet address, or transaction hash — only public, non-identifying values
 * (campaign slug, a coarse amount bucket, a share channel).
 *
 * `track` is a no-op outside production unless `<Analytics debug />` is mounted,
 * so calling these helpers from client interactions is always safe.
 */

/** Closed set of funnel event names. */
export type FunnelEvent =
  | "landing_view"
  | "donate_intent"
  | "amount_entered"
  | "onramp_started"
  | "onramp_completed"
  | "receipt_viewed"
  | "shared";

/**
 * Coarse amount bucket. We send the bucket — never the exact cents value — so a
 * donor cannot be re-identified from a small donor pool via amount + timestamp.
 */
export type AmountBucket = "25" | "50" | "100" | "custom";

/** Share surface the donor used. No URL / txid is ever attached. */
export type ShareChannel = "copy" | "twitter" | "whatsapp";

const PRESET_BUCKETS: Readonly<Record<number, AmountBucket>> = {
  2500: "25",
  5000: "50",
  10000: "100",
};

/**
 * Maps an integer-cents amount to its coarse bucket. Known presets map to their
 * dollar label; anything else (including custom entry) is `"custom"`.
 */
export function amountBucket(cents: number): AmountBucket {
  return PRESET_BUCKETS[cents] ?? "custom";
}

// ---------------------------------------------------------------------------
// Funnel event emitters — each one is the only place its event is produced.
// Props are non-identifying by construction (see module doc).
// ---------------------------------------------------------------------------

/** Landing page mounted. No props. */
export function trackLandingView(): void {
  track("landing_view");
}

/** Donor arrived on a campaign's donate page. Campaign slug is public. */
export function trackDonateIntent(campaignId: string): void {
  track("donate_intent", { campaignId });
}

/** Donor selected/entered an amount. Sends the bucket, never the raw amount. */
export function trackAmountEntered(
  campaignId: string,
  bucket: AmountBucket,
): void {
  track("amount_entered", { campaignId, bucket });
}

/** Donor committed to the onramp (submit succeeded, redirect imminent). */
export function trackOnrampStarted(
  campaignId: string,
  bucket: AmountBucket,
): void {
  track("onramp_started", { campaignId, bucket });
}

/** Processing flow observed the session settle. No session id / txid. */
export function trackOnrampCompleted(campaignId: string): void {
  track("onramp_completed", { campaignId });
}

/** Receipt page viewed. No props — the route txid is identifying. */
export function trackReceiptViewed(): void {
  track("receipt_viewed");
}

/** Donor shared the receipt. Sends only which surface, never the link. */
export function trackShared(channel: ShareChannel): void {
  track("shared", { channel });
}

/** Donation amounts below this (in cents) are not yet a meaningful selection. */
export const AMOUNT_TRACK_THRESHOLD_CENTS = 100;

/**
 * Decides whether an amount change should emit `amount_entered`, debouncing so
 * the event fires at most once per "selection session" rather than on every
 * keystroke of the custom input. Reset the `alreadyFired` flag (caller's ref)
 * whenever the donor toggles between preset and custom mode.
 *
 * Fires when the amount first reaches the meaningful threshold and we have not
 * fired since the last reset.
 */
export function shouldTrackAmountEntered(
  cents: number,
  alreadyFired: boolean,
): boolean {
  return !alreadyFired && cents >= AMOUNT_TRACK_THRESHOLD_CENTS;
}
