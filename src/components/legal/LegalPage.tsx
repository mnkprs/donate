import type { ReactNode } from "react";

import { Footer } from "@/components/landing/Footer";
import { NavBar } from "@/components/landing/NavBar";

interface LegalPageProps {
  readonly title: string;
  readonly lastUpdated: string;
  readonly children: ReactNode;
}

/**
 * Shared shell for the static legal surfaces (Terms, Privacy). Reuses the
 * site NavBar and Footer so legal pages stay visually consistent with the
 * marketing surfaces, and applies the document-style typography rhythm from
 * DESIGN.md (thin display heading, generous body leading on white canvas).
 */
export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <>
      <NavBar />
      <main className="bg-white px-4 pb-24 pt-28 sm:px-6 lg:px-16">
        <article className="mx-auto max-w-[680px]">
          <header>
            <h1 className="text-4xl font-light leading-[1.1] tracking-[-0.96px] text-ink">
              {title}
            </h1>
            <p className="mt-3 text-xs text-mute">
              Last updated {lastUpdated}
            </p>
          </header>
          <div className="mt-10 flex flex-col gap-8">{children}</div>
        </article>
      </main>
      <Footer />
    </>
  );
}

interface LegalSectionProps {
  readonly heading: string;
  readonly children: ReactNode;
}

/** A titled section block within a legal document. */
export function LegalSection({ heading, children }: LegalSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-light tracking-[-0.22px] text-ink">
        {heading}
      </h2>
      <div className="flex flex-col gap-3 text-sm leading-[1.7] text-slate">
        {children}
      </div>
    </section>
  );
}
