"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { Mono } from "@/components/ui/Mono";
import { Num } from "@/components/ui/Num";
import { VerifyLink } from "@/components/ui/VerifyLink";
import type { LiveStage, LiveStageState } from "@/lib/onramp/live-stages";
import { colors } from "@/lib/tokens";

/**
 * The in-flight 5-stage donation tracker (Epic 5, Screen 1). Renders both a
 * desktop horizontal grid and a vertical timeline; CSS (`hidden`/`lg:hidden`)
 * shows exactly one per breakpoint, so only one is in the a11y tree at a time.
 * The horizontal grid needs ~860px of content width for its 5 cards, so it only
 * engages at `lg` (≥1024px); below that the vertical timeline is used, including
 * the tablet band where 5 columns would overflow the viewport.
 *
 * Ported from `designs/.../tracker-live.jsx`. `'use client'` because the active
 * stage runs a live elapsed-seconds counter. Motion is CSS-keyframe driven
 * (defined in globals.css); pulsing elements carry `data-euda-motion` so the
 * `prefers-reduced-motion` guard can disable them.
 */

const SHADOW_2 =
  "0 8px 24px rgba(0,55,112,0.08), 0 2px 6px rgba(0,55,112,0.04)";
const SHADOW_1 = "0 2px 6px rgba(0,55,112,0.05)";

interface LiveTrackerProps {
  stages: LiveStage[];
}

export function LiveTracker({ stages }: LiveTrackerProps) {
  return (
    <>
      <div className="hidden lg:block">
        <LiveTrackerHorizontal stages={stages} />
      </div>
      <div className="lg:hidden">
        <LiveTrackerVertical stages={stages} />
      </div>
    </>
  );
}

function ringColorFor(state: LiveStageState): string {
  if (state === "failed") return colors.urgent;
  if (state === "queued") return colors.steel;
  return colors.primary; // done | active
}

interface StageNodeProps {
  state: LiveStageState;
  n: number;
  size?: number;
}

function StageNode({ state, n, size = 36 }: StageNodeProps) {
  const ringColor = ringColorFor(state);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        background: colors.canvas,
        border:
          state === "queued"
            ? `1px dashed ${ringColor}`
            : `1px solid ${ringColor}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        transition: "all .2s",
        boxShadow: state === "active" ? "0 0 0 6px rgba(83,58,253,0.10)" : "none",
        flexShrink: 0,
      }}
    >
      {state === "done" && (
        <div
          style={{
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: 9999,
            background: colors.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width={size * 0.22} height={size * 0.22} viewBox="0 0 8 8" fill="none">
            <path
              d="M1.5 4L3.3 5.7L6.5 2.5"
              stroke="#fff"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
      {state === "active" && (
        <>
          <span
            data-euda-motion
            style={{
              position: "absolute",
              inset: 6,
              borderRadius: 9999,
              border: `1px solid ${colors.primary}`,
              opacity: 0.4,
              animation: "euda-pulse 1.6s ease-out infinite",
            }}
          />
          <span
            style={{
              width: size * 0.32,
              height: size * 0.32,
              borderRadius: 9999,
              background: colors.primary,
            }}
          />
        </>
      )}
      {state === "failed" && (
        <div
          style={{
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: 9999,
            background: colors.urgent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width={size * 0.22} height={size * 0.22} viewBox="0 0 8 8" fill="none">
            <path
              d="M2 2L6 6M6 2L2 6"
              stroke="#fff"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
      {state === "queued" && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 400,
            color: colors.inkMute,
            fontFeatureSettings: '"tnum","ss01"',
            letterSpacing: "-0.1px",
          }}
        >
          {n}
        </span>
      )}
    </div>
  );
}

interface StatusPillStyle {
  bg: string;
  fg: string;
  label: string;
  dot: string;
  border?: string;
  pulse?: boolean;
}

const STATUS_PILL: Record<LiveStageState, StatusPillStyle> = {
  done: { bg: colors.irisBg, fg: colors.irisPress, label: "Done", dot: colors.primary },
  active: {
    bg: colors.irisBg,
    fg: colors.irisPress,
    label: "In progress",
    dot: colors.primary,
    pulse: true,
  },
  queued: {
    bg: colors.canvas,
    fg: colors.inkMute,
    label: "Queued",
    dot: colors.steel,
    border: colors.hairline,
  },
  failed: { bg: colors.urgentBg, fg: colors.urgent, label: "Failed", dot: colors.urgent },
};

function StatusPill({ state }: { state: LiveStageState }) {
  const m = STATUS_PILL[state];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px 3px 7px",
        background: m.bg,
        color: m.fg,
        border: m.border ? `1px solid ${m.border}` : "none",
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontFeatureSettings: '"ss01"',
      }}
    >
      <span
        data-euda-motion={m.pulse ? "" : undefined}
        style={{
          width: 5,
          height: 5,
          borderRadius: 9999,
          background: m.dot,
          boxShadow: m.pulse ? "0 0 0 3px rgba(83,58,253,0.18)" : "none",
          animation: m.pulse ? "euda-dot-pulse 1.2s ease-in-out infinite" : "none",
        }}
      />
      {m.label}
    </span>
  );
}

function ActiveCounter() {
  const [seconds, setSeconds] = useState(2);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{`+${seconds}s`}</span>;
}

function FailureStrip({ reason }: { reason?: string }) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: "8px 10px",
        background: colors.urgentBg,
        border: `1px solid ${colors.urgentSoft}`,
        borderRadius: 6,
        fontSize: 11,
        color: colors.urgent,
        letterSpacing: "-0.1px",
        lineHeight: 1.4,
      }}
    >
      {reason || "This step did not complete."}
    </div>
  );
}

function ProgressOverlay({ stages }: { stages: LiveStage[] }) {
  const lastDoneIdx = stages.reduce(
    (acc, s, i) => (s.state === "done" ? i : acc),
    -1,
  );
  const activeIdx = stages.findIndex((s) => s.state === "active");
  const failedIdx = stages.findIndex((s) => s.state === "failed");
  const endIdx = failedIdx >= 0 ? failedIdx : activeIdx >= 0 ? activeIdx : lastDoneIdx;
  if (endIdx <= 0) return null;
  const startPct = 10;
  const endPct = 10 + endIdx * 20;
  const color = failedIdx >= 0 ? colors.urgent : colors.primary;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 18,
        left: `calc(${startPct}% + 8px)`,
        width: `calc(${endPct - startPct}% - 16px)`,
        height: 1,
        background: color,
        zIndex: 0,
      }}
    />
  );
}

function StageCardHorizontal({ stage }: { stage: LiveStage }) {
  const { state } = stage;
  const isActive = state === "active";
  const isQueued = state === "queued";
  const isFailed = state === "failed";
  const isDone = state === "done";
  const visible = isDone || isActive || isFailed;

  const cardStyle: CSSProperties = {
    background: isQueued ? "transparent" : colors.canvas,
    border: isQueued
      ? `1px dashed ${colors.hairline}`
      : isFailed
        ? `1px solid ${colors.urgentSoft}`
        : isActive
          ? `1px solid ${colors.hairline}`
          : `1px solid ${colors.hairlineMute}`,
    borderRadius: 12,
    padding: 16,
    transition: "all .18s",
    boxShadow: isActive ? SHADOW_2 : "none",
    minHeight: 192,
    opacity: isQueued ? 0.78 : 1,
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 22,
          position: "relative",
          zIndex: 1,
        }}
      >
        <StageNode state={state} n={stage.n} />
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 400,
              letterSpacing: "0.1em",
              color: colors.inkMute,
              fontFeatureSettings: '"tnum","ss01"',
            }}
          >
            {`0${stage.n}`}
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 300,
              letterSpacing: "-0.2px",
              color: isQueued ? colors.inkMute : colors.ink,
            }}
          >
            {stage.title}
          </span>
          <span style={{ marginLeft: "auto" }}>
            <StatusPill state={state} />
          </span>
        </div>

        <div
          style={{
            fontSize: 12,
            color: colors.inkMute,
            letterSpacing: "-0.1px",
            marginBottom: 14,
            minHeight: 34,
            lineHeight: 1.4,
          }}
        >
          {stage.short}
        </div>

        {visible ? (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 10 }}>
              {stage.amount !== "—" ? (
                <Num size={22} weight={300} track="-0.4px" color={colors.ink}>
                  {stage.amount}
                </Num>
              ) : (
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 300,
                    color: colors.inkMute,
                    letterSpacing: "-0.4px",
                  }}
                >
                  —
                </span>
              )}
              <span style={{ fontSize: 11, color: colors.inkMute, letterSpacing: "0.05em" }}>
                {stage.unit}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                paddingTop: 10,
                borderTop: `1px dashed ${colors.hairline}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: colors.inkMute,
                }}
              >
                <span>{stage.addressLabel}</span>
                <Mono size={11} color={colors.ink}>
                  {stage.address}
                </Mono>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: colors.inkMute,
                  fontFeatureSettings: '"tnum","ss01"',
                }}
              >
                <span>{isActive ? "Pending…" : stage.timestamp}</span>
                <span>{isActive ? <ActiveCounter /> : stage.relative}</span>
              </div>
            </div>

            {isDone && (
              <div style={{ marginTop: 12 }}>
                <VerifyLink label="Verify ↗" />
              </div>
            )}
            {isFailed && <FailureStrip reason={stage.failureReason} />}
          </>
        ) : (
          <div
            style={{
              paddingTop: 10,
              borderTop: `1px dashed ${colors.hairline}`,
              fontSize: 11,
              color: colors.inkMute,
              letterSpacing: "-0.1px",
              lineHeight: 1.5,
              fontStyle: "italic",
            }}
          >
            Waits for the previous step to settle on-chain.
          </div>
        )}
      </div>
    </div>
  );
}

function LiveTrackerHorizontal({ stages }: { stages: LiveStage[] }) {
  return (
    <div style={{ position: "relative" }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 18,
          left: "calc(10% + 8px)",
          right: "calc(10% + 8px)",
          height: 1,
          background: colors.hairline,
          zIndex: 0,
        }}
      />
      <ProgressOverlay stages={stages} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 8,
          position: "relative",
          zIndex: 1,
        }}
      >
        {stages.map((stage) => (
          <StageCardHorizontal key={stage.n} stage={stage} />
        ))}
      </div>
    </div>
  );
}

function StageRowVertical({ stage, isLast }: { stage: LiveStage; isLast: boolean }) {
  const { state } = stage;
  const isActive = state === "active";
  const isQueued = state === "queued";
  const isFailed = state === "failed";
  const isDone = state === "done";
  const visible = isDone || isActive || isFailed;

  const railColor = isDone ? colors.primary : isFailed ? colors.urgent : colors.hairline;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "36px 1fr", gap: 14, position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <StageNode state={state} n={stage.n} size={32} />
        {!isLast && (
          <div
            style={{
              flex: 1,
              width: 1,
              background: isQueued ? "transparent" : railColor,
              marginTop: 4,
              marginBottom: 4,
              minHeight: 28,
              borderLeft: isQueued ? `1px dashed ${colors.hairline}` : "none",
            }}
          />
        )}
      </div>

      <div style={{ paddingBottom: 22 }}>
        <div
          style={{
            background: isQueued ? "transparent" : colors.canvas,
            border: isQueued
              ? `1px dashed ${colors.hairline}`
              : isFailed
                ? `1px solid ${colors.urgentSoft}`
                : `1px solid ${colors.hairline}`,
            borderRadius: 12,
            padding: 14,
            boxShadow: isActive ? SHADOW_1 : "none",
            opacity: isQueued ? 0.78 : 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 400,
                letterSpacing: "0.1em",
                color: colors.inkMute,
                fontFeatureSettings: '"tnum","ss01"',
              }}
            >
              {`0${stage.n}`}
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 300,
                letterSpacing: "-0.15px",
                color: isQueued ? colors.inkMute : colors.ink,
              }}
            >
              {stage.title}
            </span>
            <span style={{ marginLeft: "auto" }}>
              <StatusPill state={state} />
            </span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: colors.inkMute,
              letterSpacing: "-0.1px",
              lineHeight: 1.4,
              marginBottom: visible ? 10 : 0,
            }}
          >
            {stage.short}
          </div>

          {visible && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                paddingTop: 8,
                borderTop: `1px dashed ${colors.hairline}`,
              }}
            >
              <div>
                {stage.amount !== "—" && (
                  <span>
                    <Num size={16} weight={300} color={colors.ink}>
                      {stage.amount}
                    </Num>{" "}
                    <span style={{ fontSize: 10, color: colors.inkMute, letterSpacing: "0.05em" }}>
                      {stage.unit}
                    </span>
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.inkMute,
                  fontFeatureSettings: '"tnum","ss01"',
                }}
              >
                {isActive ? (
                  <span>
                    <ActiveCounter /> · pending…
                  </span>
                ) : isDone ? (
                  <VerifyLink label="Verify ↗" />
                ) : (
                  stage.timestamp
                )}
              </div>
            </div>
          )}
          {isFailed && <FailureStrip reason={stage.failureReason} />}
        </div>
      </div>
    </div>
  );
}

function LiveTrackerVertical({ stages }: { stages: LiveStage[] }) {
  return (
    <div style={{ position: "relative", paddingLeft: 4 }}>
      {stages.map((stage, i) => (
        <StageRowVertical key={stage.n} stage={stage} isLast={i === stages.length - 1} />
      ))}
    </div>
  );
}
