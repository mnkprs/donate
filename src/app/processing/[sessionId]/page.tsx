import { notFound } from "next/navigation";

import { ProcessingClient } from "@/components/processing/ProcessingClient";
import { getCampaignById } from "@/lib/campaigns";
import { buildProcessingView } from "@/lib/onramp/processing-view";
import { inMemorySessionStore } from "@/lib/onramp/session-store";
import type { OnrampSession, OnrampStatusResponse } from "@/types/onramp";

/**
 * `/processing/[sessionId]` — live processing screen (Epic 5, Screen 1).
 *
 * Server component: resolves the donor-private session (which carries the email
 * we must mask) from the in-memory store, joins the campaign for charity
 * metadata, and hands the client a display-ready view plus a seeded status
 * projection. The email is masked HERE so the raw address never reaches the
 * browser bundle. Live updates and the settle-redirect happen in
 * {@link ProcessingClient}.
 *
 * NOTE (follow-up): an end-to-end Playwright spec driving created→pending→
 * settled and asserting the `/receipt/[txHash]` redirect is deferred to the
 * Epic 5 "Day 6" E2E pass (template: `e2e/onramp.spec.ts`); it needs a seam to
 * seed the in-memory store from the test, which lands with the webhook
 * per-stage work.
 */

/** Build the same narrow public projection the status route returns, for seeding. */
function toStatusResponse(session: OnrampSession): OnrampStatusResponse {
  const base: OnrampStatusResponse = {
    sessionId: session.id,
    status: session.status,
    campaignId: session.campaignId,
    grossCents: session.grossCents,
  };
  return session.txHash !== undefined
    ? { ...base, txHash: session.txHash }
    : base;
}

export default async function ProcessingPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await inMemorySessionStore.get(sessionId);
  if (!session) {
    notFound();
  }

  const campaign = getCampaignById(session.campaignId);
  if (!campaign) {
    notFound();
  }

  const view = buildProcessingView({ session, campaign, now: new Date() });

  return (
    <ProcessingClient view={view} initialStatus={toStatusResponse(session)} />
  );
}
