import { Wordmark } from "@/components/brand/Wordmark";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-rule bg-white px-4 py-12 sm:px-6 lg:px-16">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-[420px]">
          <Wordmark size={14} />
          <p
            className="mt-4 text-xs leading-[1.6] text-mute"
            style={{ letterSpacing: "-0.1px" }}
          >
            Eudaimonia routes donations to vetted 501(c)(3) charities through
            Endaoment Org Funds on Base L2. We take a flat 1% platform fee,
            disclosed in every receipt. Donations are tax-deductible in the US;
            your receipt is your record.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-xs text-mute">
          <span>&copy; {year} Eudaimonia</span>
          <a href="/terms" className="text-ink no-underline hover:opacity-70">
            Terms
          </a>
          <a href="/privacy" className="text-ink no-underline hover:opacity-70">
            Privacy
          </a>
          <a href="/fee-policy" className="text-ink no-underline hover:opacity-70">
            Fee policy
          </a>
        </div>
      </div>
    </footer>
  );
}
