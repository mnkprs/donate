"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { trackOnrampCompleted } from "@/lib/analytics/events";
import { ProcessingScreen } from "@/components/processing/ProcessingScreen";
import {
  buildLiveStages,
  deriveLiveStages,
} from "@/lib/onramp/live-stages";
import type { ProcessingView } from "@/lib/onramp/processing-view";
import { fetchOnrampStatus } from "@/lib/onramp/status-client";
import type { OnrampStatusResponse } from "@/types/onramp";

/**
 * Client shell for the live processing screen (Epic 5, Screen 1).
 *
 * Polls `/api/onramp/status/[sessionId]` every 2s via React Query while the
 * session is non-terminal, derives the tracker position from the status, and
 * `router.replace`s to `/receipt/[txHash]` the moment it settles — the donor
 * never lingers on the published-stage card. The server page seeds initial
 * status so the first paint matches the SSR markup (no hydration flash).
 */

const POLL_INTERVAL_MS = 2000;
const TOTAL_STAGES = 5;

interface ProcessingClientProps {
  view: ProcessingView;
  initialStatus: OnrampStatusResponse;
}

export function ProcessingClient({ view, initialStatus }: ProcessingClientProps) {
  const router = useRouter();

  const { data } = useQuery<OnrampStatusResponse>({
    queryKey: ["onramp-status", view.sessionId],
    queryFn: () => fetchOnrampStatus(view.sessionId),
    initialData: initialStatus,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "settled" || status === "failed"
        ? false
        : POLL_INTERVAL_MS;
    },
  });

  const status = data.status;
  const txHash = data.txHash;
  const campaignId = data.campaignId;

  // Fire `onramp_completed` exactly once when the session settles. The redirect
  // effect below re-runs on every poll/render until navigation lands, so a ref
  // guard prevents duplicate funnel events. Prop is PII-free: campaign slug
  // only — never the session id or transaction hash.
  const completedFiredRef = useRef(false);
  useEffect(() => {
    if (status === "settled" && !completedFiredRef.current) {
      completedFiredRef.current = true;
      trackOnrampCompleted(campaignId);
    }
  }, [status, campaignId]);

  useEffect(() => {
    if (status === "settled" && txHash) {
      router.replace(`/receipt/${txHash}`);
    }
  }, [status, txHash, router]);

  const { currentStage, failedAt } = deriveLiveStages(status);
  const stages = buildLiveStages({
    currentStage,
    failedAt,
    grossCents: view.grossCents,
  });
  // Eyebrow shows a 1–5 step; `settled` (currentStage 6) clamps before redirect.
  const displayStage = failedAt ?? Math.min(currentStage, TOTAL_STAGES);

  return (
    <ProcessingScreen
      view={view}
      stages={stages}
      currentStage={displayStage}
      isFailed={status === "failed"}
    />
  );
}
