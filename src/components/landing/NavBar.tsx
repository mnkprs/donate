import Link from "next/link";

import { Wordmark } from "@/components/brand/Wordmark";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { PillButton } from "@/components/ui/PillButton";

const NAV_LINKS = [
  { label: "Causes", href: "#causes" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Receipts", href: "#receipts" },
  { label: "For nonprofits", href: "#for-nonprofits" },
] as const;

export function NavBar() {
  return (
    <nav
      aria-label="Primary"
      className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-6 sm:px-6 lg:px-16"
    >
      <Link
        href="/"
        className="inline-flex min-h-11 items-center no-underline"
      >
        <Wordmark size={15} />
      </Link>

      <div className="hidden items-center gap-7 md:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="inline-flex min-h-11 items-center text-sm tracking-[-0.1px] text-ink no-underline hover:text-iris"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/sign-in"
          className="hidden min-h-11 items-center text-sm tracking-[-0.1px] text-ink no-underline hover:text-iris sm:inline-flex"
        >
          Sign in
        </Link>
        <PillButton
          href="/donate"
          variant="primary"
          icon={<ArrowRight color="#fff" />}
        >
          Donate
        </PillButton>
      </div>
    </nav>
  );
}
