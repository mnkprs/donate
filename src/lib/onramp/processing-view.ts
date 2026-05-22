/**
 * View-model assembly for the live processing screen (Epic 5, Screen 1).
 *
 * Pure helpers that turn a persisted `OnrampSession` + its `Campaign` into the
 * display-ready props the screen renders. Email is masked HERE (server-side),
 * so the donor's real address never crosses to the client bundle — only the
 * `m***@domain` form is passed down.
 */
import { charityInitials, formatDollars } from "@/lib/onramp/live-stages";
import type { Campaign } from "@/types/campaign";
import type { OnrampSession } from "@/types/onramp";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * Mask an email for display: first local-part char, then `***`, then the full
 * domain — e.g. `manos@protonmail.com` → `m***@protonmail.com`. Anything that
 * is not a single-`@` address collapses to `***` (never echo raw input).
 */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1 || at !== email.lastIndexOf("@") || at === email.length - 1) {
    return "***";
  }
  return `${email[0]}***${email.slice(at)}`;
}

/** Format a UTC instant as `"5:34:01 PM UTC · May 21, 2026"`. */
export function formatStartedAt(date: Date): string {
  const hours24 = date.getUTCHours();
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  const month = MONTHS[date.getUTCMonth()];
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  return `${hours12}:${mm}:${ss} ${meridiem} UTC · ${month} ${day}, ${year}`;
}

export interface ProcessingView {
  readonly sessionId: string;
  readonly amountDisplay: string;
  readonly grossCents: number;
  readonly charityName: string;
  readonly charityInitials: string;
  readonly ein: string;
  readonly donorEmailMasked: string;
  readonly startedAt: string;
}

export interface BuildProcessingViewInput {
  readonly session: Pick<
    OnrampSession,
    "id" | "grossCents" | "donorEmail" | "campaignId"
  >;
  readonly campaign: Pick<Campaign, "name" | "ein">;
  readonly now: Date;
}

export function buildProcessingView({
  session,
  campaign,
  now,
}: BuildProcessingViewInput): ProcessingView {
  return {
    sessionId: session.id,
    amountDisplay: formatDollars(session.grossCents),
    grossCents: session.grossCents,
    charityName: campaign.name,
    charityInitials: charityInitials(campaign.name),
    ein: campaign.ein,
    donorEmailMasked: maskEmail(session.donorEmail),
    startedAt: formatStartedAt(now),
  };
}
