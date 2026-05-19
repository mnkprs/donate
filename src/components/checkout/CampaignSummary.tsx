import type { CSSProperties } from "react";

import { StripedPlaceholder } from "@/components/ui/StripedPlaceholder";
import type { Campaign } from "@/types/campaign";

interface CampaignSummaryProps {
  campaign: Campaign;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  const sole = words[0] ?? "";
  return sole.slice(0, 2).toUpperCase();
}

export function CampaignSummary({ campaign }: CampaignSummaryProps) {
  const initials = getInitials(campaign.name);

  const gradientStyle: CSSProperties = {
    background: `linear-gradient(135deg, ${campaign.swatch} 0%, ${campaign.swatch2} 100%)`,
  };

  return (
    <section
      aria-labelledby="campaign-summary-name"
      className="flex flex-col gap-5 rounded-xl border border-rule bg-white p-6 shadow-[0_1px_3px_rgba(0,55,112,0.06)]"
    >
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg text-lg font-light tracking-[-0.2px] text-white"
          style={gradientStyle}
        >{initials}</div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex items-center rounded-full bg-tint px-2 py-0.5 text-[9.5px] font-normal uppercase tracking-[0.1em] text-iris">
            {campaign.tag}
          </div>
          <h2
            id="campaign-summary-name"
            className="text-lg font-light leading-tight tracking-[-0.2px] text-ink text-pretty"
          >
            {campaign.name}
          </h2>
          <div className="mt-1 text-xs tracking-[-0.1px] text-mute tabular-nums">
            {`EIN ${campaign.ein} · 501(c)(3) via Endaoment`}
          </div>
        </div>
      </div>

      <p className="text-sm font-light leading-relaxed tracking-[-0.1px] text-mute">
        {campaign.mission}
      </p>

      <StripedPlaceholder caption={campaign.photoCaption} height={180} />
    </section>
  );
}
