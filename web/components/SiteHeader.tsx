"use client";

import { useState } from "react";
import { Logo } from "./Mark";

const LINKS = [
  { href: "/#modules", label: "Modules" },
  { href: "/#kernel", label: "Kernel" },
  { href: "https://github.com/Eerielettuce3717/arbor-cae", label: "Source", external: true },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-ink">
      <div className="mx-auto flex max-w-sheet items-stretch">
        <Logo className="flex min-h-11 items-center border-r border-rule px-[var(--gutter)] py-3 hover:text-signal" />

        <p className="hidden flex-1 items-center px-5 font-mono text-[11px] uppercase tracking-[0.16em] text-mute md:flex">
          DWG AR-001 · A3 · LOCAL
        </p>

        <nav
          aria-label="Main"
          className="ml-auto hidden items-stretch md:flex"
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              {...(link.external
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
              className="flex min-h-11 items-center border-l border-rule px-6 font-mono text-[11px] uppercase tracking-[0.16em] text-paper transition-colors hover:bg-panel hover:text-signal"
            >
              {link.label}
              {link.external ? " ↗" : ""}
            </a>
          ))}
        </nav>

        <button
          type="button"
          className="ml-auto flex min-h-11 min-w-11 items-center justify-center border-l border-rule px-4 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span aria-hidden className="font-mono text-xs tracking-[0.14em] text-paper">
            {open ? "CLOSE" : "MENU"}
          </span>
        </button>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-rule bg-panel md:hidden"
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              {...(link.external
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center justify-between border-b border-rule px-[var(--gutter)] font-mono text-xs uppercase tracking-[0.16em]"
            >
              {link.label}
              <span className="text-signal">{link.external ? "↗" : "→"}</span>
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
