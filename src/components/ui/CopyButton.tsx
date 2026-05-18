"use client";

import { useState } from "react";

import { colors } from "@/lib/tokens";

interface CopyButtonProps {
  value: string;
  label?: string;
}

const COPIED_FEEDBACK_MS = 1400;

export function CopyButton({ value, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    try {
      navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API unavailable (insecure context or older browser);
      // still flash the visual confirmation so the UX state is consistent.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  };

  return (
    <button
      onClick={onCopy}
      style={{
        appearance: "none",
        border: `1px solid ${colors.hairline}`,
        background: colors.canvas,
        color: colors.ink,
        fontSize: 12,
        fontWeight: 400,
        fontFamily: "inherit",
        letterSpacing: "-0.1px",
        padding: "4px 10px",
        borderRadius: 9999,
        cursor: "pointer",
        transition: "all .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.ink;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.hairline;
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
