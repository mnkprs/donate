import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { BaseMark } from "@/components/brand/BaseMark";
import { CharityAvatar } from "@/components/brand/CharityAvatar";
import { GradientMesh } from "@/components/brand/GradientMesh";

describe("CharityAvatar", () => {
  test("renders the supplied initials", () => {
    const html = renderToString(<CharityAvatar initials="PC" />);
    expect(html).toContain("PC");
  });

  test("is decorative (aria-hidden) since the name renders alongside it", () => {
    const html = renderToString(<CharityAvatar initials="PC" />);
    expect(html).toContain("aria-hidden");
  });
});

describe("BaseMark", () => {
  test("renders the Coinbase Base brand blue and is decorative", () => {
    const html = renderToString(<BaseMark />);
    expect(html).toContain("#0052ff");
    expect(html).toContain("aria-hidden");
  });
});

describe("GradientMesh", () => {
  test("renders a decorative atmospheric backdrop", () => {
    const html = renderToString(<GradientMesh />);
    expect(html).toContain("aria-hidden");
    expect(html).toContain("radial-gradient");
  });
});
