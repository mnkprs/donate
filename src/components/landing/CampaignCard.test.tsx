import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { CampaignCard } from "@/components/landing/CampaignCard";
import { CAMPAIGNS } from "@/lib/campaigns";

const pcrf = CAMPAIGNS[0];

describe("CampaignCard", () => {
  test("renders campaign name as an <h3>", () => {
    const html = renderToString(<CampaignCard campaign={pcrf} />);
    expect(html).toContain("<h3");
    // React's SSR HTML-encodes apostrophes (`'` -> `&#x27;`), so assert
    // recognizable unambiguous fragments of the name rather than the raw
    // string containing an apostrophe.
    expect(html).toContain("Children");
    expect(html).toContain("Relief Fund");
  });

  test("displays the formatted EIN", () => {
    const html = renderToString(<CampaignCard campaign={pcrf} />);
    // React 19 SSR inserts <!-- --> comment markers between adjacent static
    // text and dynamic substrings, so assert both halves are present rather
    // than the concatenated `"EIN 95-..."` string.
    expect(html).toContain("EIN");
    expect(html).toContain(pcrf.ein);
  });

  test("renders mission copy", () => {
    const html = renderToString(<CampaignCard campaign={pcrf} />);
    expect(html).toContain(pcrf.mission);
  });

  test('Donate CTA href === /donate/${campaign.id}', () => {
    const html = renderToString(<CampaignCard campaign={pcrf} />);
    expect(html).toContain(`href="/donate/${pcrf.id}"`);
  });

  test("placeholder image has role=img with accessible name from photoCaption", () => {
    const html = renderToString(<CampaignCard campaign={pcrf} />);
    expect(html).toContain('role="img"');
    expect(html).toContain(`aria-label="${pcrf.photoCaption}"`);
  });

  test("stats=undefined renders skeleton placeholders (NOT $0)", () => {
    const html = renderToString(<CampaignCard campaign={pcrf} />);
    expect(html).toContain("animate-pulse");
    expect(html).not.toMatch(/\$0\b/);
  });

  test("stats={status:'loading'} renders aria-busy skeletons", () => {
    const html = renderToString(
      <CampaignCard campaign={pcrf} stats={{ status: "loading" }} />,
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("animate-pulse");
  });

  test('stats={status:\'error\'} renders "Stats unavailable" message (no $0 lie)', () => {
    const html = renderToString(
      <CampaignCard campaign={pcrf} stats={{ status: "error" }} />,
    );
    expect(html).toContain("Stats unavailable");
    expect(html).not.toMatch(/\$0\b/);
  });

  test('renders "Verified by Endaoment" badge', () => {
    const html = renderToString(<CampaignCard campaign={pcrf} />);
    expect(html).toContain("Verified by Endaoment");
  });

  test("loaded stats render raised/donors/receipts values", () => {
    const html = renderToString(
      <CampaignCard
        campaign={pcrf}
        stats={{
          status: "loaded",
          raised: "184,902",
          donors: "4,218",
          receipts: "4,180",
        }}
      />,
    );
    expect(html).toContain("184,902");
    expect(html).toContain("4,218");
    expect(html).toContain("4,180");
  });
});
