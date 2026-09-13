import type { ReactNode } from "react";
import { PageShell } from "./PageShell";
import { LEGAL } from "@/lib/legal";

export type LegalTocItem = { id: string; label: string };

export function LegalDoc({
  docId,
  kicker,
  title,
  lede,
  toc,
  crumbHref,
  children,
}: {
  docId: string;
  kicker: string;
  title: string;
  lede: string;
  toc: LegalTocItem[];
  crumbHref: string;
  children: ReactNode;
}) {
  return (
    <PageShell crumbs={[{ name: title, path: crumbHref }]}>
      <main id="main">
        <header className="border-b border-rule bg-ink">
          <div className="mx-auto grid max-w-sheet lg:grid-cols-12">
            <div className="px-[var(--gutter)] py-12 sm:py-16 lg:col-span-8 lg:border-r lg:border-rule lg:py-20">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-signal">
                {kicker}
              </p>
              <h1 className="mt-4 font-display text-h2 text-paper sm:text-display">
                {title}
              </h1>
              <p className="mt-6 max-w-[62ch] text-body text-mute">{lede}</p>
            </div>
            <aside className="grid grid-cols-2 gap-px bg-rule lg:col-span-4 lg:grid-cols-1">
              <MetaCell label="Document" value={docId} />
              <MetaCell label="Effective" value={LEGAL.effective} />
              <MetaCell label="Operator" value={LEGAL.operator} />
              <MetaCell label="Governing law" value="California, USA" />
            </aside>
          </div>
        </header>

        <div className="mx-auto grid max-w-sheet lg:grid-cols-12">
          <nav
            aria-label="On this page"
            className="border-b border-rule px-[var(--gutter)] py-10 lg:col-span-4 lg:border-b-0 lg:border-r lg:py-16"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-mute">
              Contents
            </p>
            <ol className="mt-6 space-y-1 lg:sticky lg:top-16">
              {toc.map((item, i) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="group flex items-baseline gap-3 py-1.5 text-paper hover:text-signal"
                  >
                    <span className="font-mono text-[11px] text-mute group-hover:text-signal">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[0.95rem] leading-snug">{item.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="px-[var(--gutter)] py-12 lg:col-span-8 lg:py-16">
            <div className="legal-prose max-w-[66ch]">{children}</div>
          </article>
        </div>
      </main>
    </PageShell>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink px-[var(--gutter)] py-6 lg:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
        {label}
      </p>
      <p className="mt-1.5 font-display text-paper">{value}</p>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 border-t border-rule pt-10 first:border-t-0 first:pt-0">
      <h2 className="font-display text-h3 text-paper">{title}</h2>
      <div className="mt-4 space-y-4 text-mute">{children}</div>
    </section>
  );
}

export function LegalCallout({
  kicker,
  title,
  children,
  tone = "signal",
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  tone?: "signal" | "paper";
}) {
  const border = tone === "signal" ? "border-signal" : "border-paper";
  const kickerColor = tone === "signal" ? "text-signal" : "text-paper";
  return (
    <aside className={`border ${border} bg-panel p-5 sm:p-6`}>
      <p className={`font-mono text-[10px] uppercase tracking-[0.16em] ${kickerColor}`}>
        {kicker}
      </p>
      <p className="mt-2 font-display text-h3 text-paper">{title}</p>
      <div className="mt-3 space-y-3 text-[0.98rem] leading-relaxed text-mute">
        {children}
      </div>
    </aside>
  );
}
