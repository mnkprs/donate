import { ArrowRight } from "@/components/ui/ArrowRight";
import { PillButton } from "@/components/ui/PillButton";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-40 sm:px-6 lg:px-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-40 top-[-160px] z-0 h-[720px] blur-[36px]"
        style={{
          background: `
            radial-gradient(55% 70% at 18% 25%, rgba(245,233,212,0.65), transparent 60%),
            radial-gradient(45% 65% at 78% 18%, rgba(249,107,238,0.14), transparent 60%),
            radial-gradient(55% 75% at 52% 38%, rgba(83,58,253,0.13), transparent 65%),
            radial-gradient(40% 60% at 92% 50%, rgba(234,34,97,0.08), transparent 60%)
          `,
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1240px]">
        <div className="max-w-[920px]">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-rule bg-white px-3 py-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-iris"
              style={{ boxShadow: "0 0 0 4px rgba(83,58,253,0.12)" }}
            />
            <span className="text-xs tracking-[-0.1px] text-ink">
              On-chain settlement · Base L2 · Endaoment-routed
            </span>
          </div>

          <h1
            className="m-0 text-4xl font-light leading-[1.02] text-ink sm:text-5xl lg:text-[64px]"
            style={{ letterSpacing: "-1.6px", textWrap: "pretty" }}
          >
            Give once.{" "}
            <span
              style={{
                backgroundImage:
                  "linear-gradient(transparent 68%, rgba(83,58,253,0.18) 68%, rgba(83,58,253,0.18) 92%, transparent 92%)",
              }}
            >
              See exactly where it goes.
            </span>
          </h1>

          <p
            className="mt-6 max-w-[640px] text-base font-light leading-[1.5] text-slate sm:text-lg"
            style={{ letterSpacing: "-0.1px", textWrap: "pretty" }}
          >
            Philotimo routes everyday card payments through Base L2 to vetted
            charities — and publishes a public, immutable receipt for every
            donation. No accounts. No crypto knowledge required. One percent
            platform fee, disclosed in plain sight.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <PillButton
              href="#causes"
              variant="primary"
              size="lg"
              icon={<ArrowRight color="#fff" />}
            >
              Choose a cause
            </PillButton>
            <PillButton
              href="#example-receipt"
              variant="secondary"
              size="lg"
              disabled
              icon={<ArrowRight color="currentColor" />}
            >
              See an example receipt
            </PillButton>
          </div>

          <div
            className="mt-7 flex flex-wrap items-center gap-x-[18px] gap-y-2 text-[13px] text-mute"
            style={{
              letterSpacing: "-0.1px",
              fontFeatureSettings: '"tnum","ss01"',
            }}
          >
            <span>$1 minimum</span>
            <span className="inline-block h-[3px] w-[3px] rounded-full bg-steel" />
            <span>Card · Apple Pay · Google Pay</span>
            <span className="inline-block h-[3px] w-[3px] rounded-full bg-steel" />
            <span>501(c)(3) tax-deductible via Endaoment</span>
          </div>
        </div>
      </div>
    </section>
  );
}
