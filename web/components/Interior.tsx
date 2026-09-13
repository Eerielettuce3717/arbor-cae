import Link from "next/link";
import type { ReactNode } from "react";

export function InteriorHeader({
  kicker,
  title,
  lede,
  aside,
}: {
  kicker: string;
  title: string;
  lede: string;
  aside?: ReactNode;
}) {
  return (
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
        <aside className="px-[var(--gutter)] py-10 lg:col-span-4 lg:py-20">
          {aside}
        </aside>
      </div>
    </header>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="legal-prose max-w-[66ch] space-y-4 text-mute">{children}</div>
  );
}

export function TextLink({
  href,
  children,
  external,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-paper underline decoration-rule underline-offset-4 hover:text-signal"
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="text-paper underline decoration-rule underline-offset-4 hover:text-signal"
    >
      {children}
    </Link>
  );
}
