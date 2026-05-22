"use client";

import { useEffect, useState } from "react";

import { colors } from "@/lib/tokens";

interface Face {
  text: string;
  fontFamily: string;
  size: number;
  color: string;
  track: string;
  italic?: boolean;
}

// The brand name as a living thing: English → Greek → IPA → translation.
const FACES: readonly Face[] = [
  { text: "Eudaimonia", fontFamily: '"Inter", system-ui, sans-serif', size: 18, color: colors.ink, track: "-0.3px" },
  { text: "εὐδαιμονία", fontFamily: 'Georgia, "Times New Roman", serif', size: 18, color: colors.ink, track: "-0.2px" },
  { text: "[eu̯dai̯moníaː]", fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace', size: 14, color: colors.primary, track: "-0.2px" },
  { text: "human flourishing", fontFamily: '"Inter", system-ui, sans-serif', size: 17, color: colors.ink, track: "-0.2px", italic: true },
];

const CYCLE_MS = 2200;

export function CycleWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % FACES.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  const face = FACES[index];

  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: face.fontFamily,
        fontSize: face.size,
        color: face.color,
        letterSpacing: face.track,
        fontWeight: 400,
        fontStyle: face.italic ? "italic" : "normal",
        fontFeatureSettings: '"ss01"',
      }}
    >
      {face.text}
    </span>
  );
}
