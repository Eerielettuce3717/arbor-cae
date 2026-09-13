import type { Metadata } from "next";
import { AppLink } from "@/components/AppLink";
import { PageShell } from "@/components/PageShell";
import { ROUTES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sheet not found — Arbor",
  description:
    "No page exists at this path on the Arbor site. Return home, or open specs, modules, or download.",
  robots: { index: false, follow: true },
  alternates: { canonical: "https://eerielettuce3717.github.io/404.html" },
  openGraph: {
    title: "Sheet not found — Arbor",
    description:
      "No page exists at this path on the Arbor site. Return home, or open specs, modules, or download.",
    url: "https://eerielettuce3717.github.io/404.html",
    siteName: "Arbor",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Arbor — parametric CAD, native ECAD, zero cloud",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sheet not found — Arbor",
    description:
      "No page exists at this path on the Arbor site. Return home, or open specs, modules, or download.",
    images: ["/og.png"],
  },
};

export default function NotFound() {
  return (
    <PageShell nativeLinks>
      <main id="main">
        <header className="border-b border-rule bg-ink">
          <div className="mx-auto max-w-sheet px-[var(--gutter)] py-16 sm:py-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-signal">
              HTTP 404
            </p>
            <h1 className="mt-4 font-display text-h2 text-paper sm:text-display">
              This sheet is not in the set
            </h1>
            <p className="mt-6 max-w-[46ch] text-body text-mute">
              No document exists at this path. The drawing list is home, about,
              specs, modules, download, contribute, FAQ, and license.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <AppLink
                href={ROUTES.home}
                className="inline-flex min-h-11 items-center border border-rule px-6 font-mono text-[11px] uppercase tracking-[0.16em] text-paper hover:border-paper"
              >
                Return home
              </AppLink>
              <AppLink
                href={ROUTES.specs}
                className="inline-flex min-h-11 items-center border border-rule px-6 font-mono text-[11px] uppercase tracking-[0.16em] text-paper hover:border-paper"
              >
                Open specs
              </AppLink>
              <AppLink
                href={ROUTES.faq}
                className="inline-flex min-h-11 items-center border border-rule px-6 font-mono text-[11px] uppercase tracking-[0.16em] text-paper hover:border-paper"
              >
                Read FAQ
              </AppLink>
            </div>
          </div>
        </header>
      </main>
    </PageShell>
  );
}
