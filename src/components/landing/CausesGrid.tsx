import { CampaignCard } from "@/components/landing/CampaignCard";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import type { Campaign } from "@/lib/campaigns";

interface CausesGridProps {
  campaigns: Campaign[];
}

export function CausesGrid({ campaigns }: CausesGridProps) {
  return (
    <section
      id="causes"
      aria-labelledby="causes-heading"
      className="bg-white px-4 py-24 sm:px-6 lg:px-16"
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <EyebrowLabel>This week&apos;s causes</EyebrowLabel>
            <h2
              id="causes-heading"
              className="mt-2.5 max-w-[720px] text-[28px] font-light leading-[1.05] text-ink sm:text-[36px] lg:text-[44px]"
              style={{ letterSpacing: "-0.96px", textWrap: "pretty" }}
            >
              A small list, refreshed weekly. We vet every charity through
              Endaoment and stake our reputation on the routing.
            </h2>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div
      role="status"
      className="rounded-xl border border-dashed border-rule bg-tint px-6 py-12 text-center text-sm text-mute"
    >
      No campaigns this week — check back soon.
    </div>
  );
}
