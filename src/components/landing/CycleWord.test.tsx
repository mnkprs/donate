import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { CycleWord } from "@/components/landing/CycleWord";

describe("CycleWord", () => {
  test("server-renders the initial English face", () => {
    const html = renderToString(<CycleWord />);
    expect(html).toContain("Eudaimonia");
  });

  test("renders one face at rest (later faces are revealed on the timer)", () => {
    const html = renderToString(<CycleWord />);
    expect(html).not.toContain("human flourishing");
  });
});
