import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Num } from "@/components/ui/Num";
import type { FeeBreakdown, FeeRow } from "@/types/checkout";

export type OrderSummaryState = "ready" | "submitting";

interface OrderSummaryProps {
  breakdown: FeeBreakdown;
  state?: OrderSummaryState;
}

function formatCents(amountCents: number): string {
  const dollars = (amountCents / 100).toFixed(2);
  return `$${dollars}`;
}

function Row({ row }: { row: FeeRow }) {
  const labelColorClass = row.muted ? "text-mute" : "text-ink";
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div>
        <div
          className={`text-[13px] font-light tracking-tight ${labelColorClass}`}
        >
          {row.label}
        </div>
        {row.sub && (
          <div className="mt-0.5 text-[11px] tracking-tight text-mute">
            {row.sub}
          </div>
        )}
      </div>
      <Num
        size={row.strong ? 17 : 14}
        weight={300}
        track={row.strong ? "-0.3px" : "-0.42px"}
        color={row.muted ? "#56627a" : "#0d253d"}
      >
        {formatCents(row.amountCents)}
      </Num>
    </div>
  );
}

function SkeletonBody() {
  return (
    <div className="animate-pulse py-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 border-b border-dashed border-rule-soft py-3 last:border-b-0"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-2.5 w-32 rounded bg-rule-soft" />
            <div className="h-2 w-44 rounded bg-rule-soft" />
          </div>
          <div className="h-3.5 w-16 rounded bg-rule-soft" />
        </div>
      ))}
      <div className="mt-2 flex items-center justify-between gap-4 rounded-lg bg-tint px-2.5 py-3.5">
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-40 rounded bg-rule-soft" />
          <div className="h-2 w-52 rounded bg-rule-soft" />
        </div>
        <div className="h-5 w-20 rounded bg-rule-soft" />
      </div>
    </div>
  );
}

function EmptyBody() {
  return (
    <div className="px-1 py-6 text-center">
      <p className="text-[13px] font-light tracking-tight text-mute">
        Enter an amount to see the breakdown.
      </p>
    </div>
  );
}

export function OrderSummary({ breakdown, state = "ready" }: OrderSummaryProps) {
  const isSubmitting = state === "submitting";
  const hasRows = breakdown.rows.length > 0;

  return (
    <aside
      aria-busy={isSubmitting}
      aria-label="Order summary"
      className="sticky top-6 overflow-hidden rounded-xl border border-rule bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-rule-soft px-6 py-4">
        <EyebrowLabel>Order summary</EyebrowLabel>
      </div>

      <div className="px-6 py-1">
        {isSubmitting ? (
          <SkeletonBody />
        ) : hasRows ? (
          breakdown.rows.map((row) => <Row key={row.kind} row={row} />)
        ) : (
          <EmptyBody />
        )}
      </div>
    </aside>
  );
}
