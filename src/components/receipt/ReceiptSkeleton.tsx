import { colors } from "@/lib/tokens";

/**
 * Full-page loading skeleton for the receipt route.
 *
 * Renders 5 shimmer stage cards (mirroring the PizzaTracker layout) plus
 * skeleton placeholders for CharityCard and VerificationCard.
 *
 * - No visual spinner / `role="progressbar"` — shimmer-only by design.
 * - The root carries `role="status"` + `aria-live="polite"` so screen readers
 *   announce the loading state and its resolution (`aria-busy` alone on a
 *   non-live element has no defined AT behaviour).
 * - Uses the `euda-skel` keyframe from globals.css for the pulse animation.
 * - Every animated element carries `data-euda-motion` so the
 *   `prefers-reduced-motion` media-query rule in globals.css suppresses it.
 */

const STAGE_COUNT = 5;

/** Shimmer pulse animation shorthand, shared by every skeleton element. */
const SKELETON_ANIMATION = "euda-skel 1.6s ease-in-out infinite";

function SkeletonLine({
  width = "100%",
  height = 12,
  radius = 6,
  style,
}: {
  width?: string | number;
  height?: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      data-euda-motion
      style={{
        width,
        height,
        borderRadius: radius,
        background: colors.hairline,
        animation: SKELETON_ANIMATION,
        ...style,
      }}
    />
  );
}

function SkeletonStageCard() {
  return (
    <div
      data-testid="receipt-skeleton-stage"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* Stage node circle */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 24,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          data-euda-motion
          style={{
            width: 36,
            height: 36,
            borderRadius: 9999,
            background: colors.hairline,
            animation: SKELETON_ANIMATION,
          }}
        />
      </div>

      {/* Card body */}
      <div
        style={{
          background: colors.surfaceMute,
          border: `1px solid ${colors.hairlineMute}`,
          borderRadius: 12,
          padding: 16,
          minHeight: 220,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Stage number + title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SkeletonLine width={20} height={10} />
          <SkeletonLine width="60%" height={14} />
        </div>

        {/* Short description */}
        <SkeletonLine width="90%" height={10} />
        <SkeletonLine width="75%" height={10} />

        {/* Amount */}
        <SkeletonLine width="50%" height={22} style={{ marginTop: 4 }} />

        {/* Footer rows */}
        <div
          style={{
            paddingTop: 10,
            borderTop: `1px dashed ${colors.hairline}`,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <SkeletonLine width="30%" height={10} />
            <SkeletonLine width="40%" height={10} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <SkeletonLine width="35%" height={10} />
            <SkeletonLine width="20%" height={10} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCharityCard() {
  return (
    <section
      data-testid="receipt-skeleton-charity"
      style={{ maxWidth: 1240, margin: "0 auto", padding: "0 64px 56px" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "88px 1fr auto",
          gap: 28,
          alignItems: "center",
          background: colors.canvas,
          border: `1px solid ${colors.hairline}`,
          borderRadius: 12,
          padding: 32,
          boxShadow: "0 1px 3px rgba(0,55,112,0.08)",
        }}
      >
        {/* Avatar */}
        <div
          data-euda-motion
          style={{
            width: 88,
            height: 88,
            borderRadius: 12,
            background: colors.hairline,
            animation: SKELETON_ANIMATION,
          }}
        />

        {/* Text block */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SkeletonLine width="15%" height={10} />
          <SkeletonLine width="55%" height={20} />
          <SkeletonLine width="40%" height={10} />
          <SkeletonLine width="90%" height={10} />
          <SkeletonLine width="80%" height={10} />
        </div>

        {/* CTA button */}
        <div
          data-euda-motion
          style={{
            width: 120,
            height: 34,
            borderRadius: 9999,
            background: colors.hairline,
            animation: SKELETON_ANIMATION,
          }}
        />
      </div>
    </section>
  );
}

function SkeletonVerificationCard() {
  return (
    <section
      data-testid="receipt-skeleton-verification"
      style={{ maxWidth: 1240, margin: "0 auto", padding: "0 64px 56px" }}
    >
      <div
        style={{
          background: colors.canvas,
          border: `1px solid ${colors.hairline}`,
          borderRadius: 12,
          display: "grid",
          gridTemplateColumns: "2.4fr 1fr 1fr",
        }}
      >
        {/* Tx hash column */}
        <div style={{ padding: 28, borderRight: `1px solid ${colors.hairline}` }}>
          <SkeletonLine width="30%" height={10} style={{ marginBottom: 14 }} />
          <SkeletonLine width="80%" height={13} />
          <SkeletonLine width="35%" height={10} style={{ marginTop: 16 }} />
        </div>

        {/* Block column */}
        <div style={{ padding: 28, borderRight: `1px solid ${colors.hairline}` }}>
          <SkeletonLine width="30%" height={10} style={{ marginBottom: 14 }} />
          <SkeletonLine width="60%" height={22} />
          <SkeletonLine width="70%" height={10} style={{ marginTop: 10 }} />
        </div>

        {/* Network column */}
        <div style={{ padding: 28 }}>
          <SkeletonLine width="30%" height={10} style={{ marginBottom: 14 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              data-euda-motion
              style={{
                width: 28,
                height: 28,
                borderRadius: 9999,
                background: colors.hairline,
                flexShrink: 0,
                animation: SKELETON_ANIMATION,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <SkeletonLine width={60} height={12} />
              <SkeletonLine width={50} height={10} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ReceiptSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label="Loading receipt">
      {/* PizzaTracker skeleton — 5 stage cards */}
      <section
        style={{
          padding: "32px 64px 88px",
          maxWidth: 1240,
          margin: "0 auto",
        }}
      >
        {/* Header skeleton */}
        <header style={{ marginBottom: 36, display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SkeletonLine width={80} height={10} />
            <SkeletonLine width={280} height={22} />
          </div>
          <SkeletonLine width={180} height={10} style={{ alignSelf: "center" }} />
        </header>

        {/* 5 stage cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 8,
            position: "relative",
          }}
        >
          {Array.from({ length: STAGE_COUNT }, (_, i) => (
            <SkeletonStageCard key={i} />
          ))}
        </div>
      </section>

      {/* CharityCard skeleton */}
      <SkeletonCharityCard />

      {/* VerificationCard skeleton */}
      <SkeletonVerificationCard />
    </div>
  );
}
