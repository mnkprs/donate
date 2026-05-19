import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { CausesGrid } from "@/components/landing/CausesGrid";
import { CAMPAIGNS, getCampaigns } from "@/lib/campaigns";

describe("CausesGrid", () => {
  test("renders <section id=causes> with the labelledby relationship", () => {
    const html = renderToString(<CausesGrid campaigns={getCampaigns()} />);
    expect(html).toContain('id="causes"');
    expect(html).toContain('aria-labelledby="causes-heading"');
    expect(html).toContain('id="causes-heading"');
  });

  test("renders one card per campaign", () => {
    const html = renderToString(<CausesGrid campaigns={getCampaigns()} />);
    for (const c of CAMPAIGNS) {
      // Assert EIN (no apostrophe) and donate href to identify each card;
      // names containing apostrophes are HTML-encoded by React's SSR and
      // would not match the raw `c.name` substring.
      expect(html).toContain(c.ein);
      expect(html).toContain(`href="/donate/${c.id}"`);
    }
  });

  test("empty list shows an empty-state message", () => {
    const html = renderToString(<CausesGrid campaigns={[]} />);
    expect(html).toContain("No campaigns this week");
  });
});
