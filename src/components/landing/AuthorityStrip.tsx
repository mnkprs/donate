import { EyebrowLabel } from "@/components/ui/EyebrowLabel";

export interface AuthorityItem {
  label: string;
  value: string;
}

export const AUTHORITY_ITEMS: readonly AuthorityItem[] = [
  { label: "Built on", value: "Endaoment" },
  { label: "Settles on", value: "Base · Coinbase L2" },
  { label: "Stablecoin", value: "USDC · Circle" },
  { label: "Payments", value: "Stripe" },
  { label: "Audits", value: "Open source · Foundry" },
] as const;

export function AuthorityStrip() {
  return (
    <section
      aria-label="Trust and infrastructure"
      className="border-y border-rule bg-white px-4 py-12 sm:px-6 lg:px-16"
    >
      <div className="mx-auto grid max-w-[1240px] grid-cols-2 items-center gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {AUTHORITY_ITEMS.map((item, i) => (
          <div
            key={item.label}
            className={
              i === 0
                ? "flex flex-col gap-1"
                : "flex flex-col gap-1 lg:border-l lg:border-rule lg:pl-6"
            }
          >
            <EyebrowLabel>{item.label}</EyebrowLabel>
            <span
              className="text-[15px] font-light text-ink"
              style={{ letterSpacing: "-0.15px" }}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
