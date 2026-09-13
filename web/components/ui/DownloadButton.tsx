"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AppLink } from "../AppLink";
import { useOS, type OS } from "@/hooks/useOS";
import { GITHUB_URL, ROUTES } from "@/lib/site";

const PRIMARY: Record<OS, { text: string; icon: OS }> = {
  macos: { text: "Build for macOS", icon: "macos" },
  windows: { text: "Build for Windows", icon: "windows" },
  linux: { text: "Build for Linux", icon: "linux" },
  other: { text: "Build from source", icon: "other" },
};

const MORE = [
  { href: ROUTES.contribute, label: "Build notes", hint: "local" },
  { href: GITHUB_URL, label: "Source", hint: "GitHub", external: true },
  { href: `${GITHUB_URL}/releases`, label: "Releases", hint: "empty", external: true },
] as const;

export function DownloadButton() {
  const os = useOS();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const primary = PRIMARY[os];

  useEffect(() => {
    if (!open) return;

    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex flex-col items-center gap-2">
      <AppLink
        href={ROUTES.contribute}
        className="inline-flex min-h-12 min-w-[16.5rem] items-center justify-center gap-2.5 bg-signal px-8 font-mono text-[12px] uppercase tracking-[0.16em] text-ink hover:bg-paper"
      >
        <PlatformIcon os={primary.icon} />
        {primary.text}
      </AppLink>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-mute hover:text-paper"
      >
        Source and releases
        <Chevron open={open} />
      </button>

      {open ? (
        <ul
          id={menuId}
          role="list"
          className="absolute top-[calc(100%+2px)] z-30 w-[18.5rem] border border-rule bg-ink"
        >
          {MORE.map((item) => (
            <li key={item.href} className="border-b border-rule last:border-b-0">
              {"external" in item && item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 items-center justify-between gap-3 px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-paper hover:bg-panel hover:text-signal"
                >
                  <span>{item.label}</span>
                  <span className="text-mute">{item.hint}</span>
                </a>
              ) : (
                <AppLink
                  href={item.href}
                  className="flex min-h-11 items-center justify-between gap-3 px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-paper hover:bg-panel hover:text-signal"
                >
                  <span>{item.label}</span>
                  <span className="text-mute">{item.hint}</span>
                </AppLink>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function DownloadStrip() {
  return (
    <div className="relative z-30 flex justify-center border-b border-rule bg-ink px-[var(--gutter)] py-5 sm:py-6">
      <DownloadButton />
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-3 w-3 ${open ? "rotate-180" : ""}`}
      aria-hidden
      fill="none"
    >
      <path
        d="M2 4.5 L6 8.5 L10 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function PlatformIcon({ os }: { os: OS }) {
  if (os === "macos") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden fill="currentColor">
        <path d="M12.7 8.3c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7s1.7.7 2.8.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.1-.8-2.1-3.2zM10.8 2.6c.6-.7 1-1.7.9-2.6-.9 0-1.9.6-2.5 1.3-.6.6-1.1 1.6-.9 2.5 1 .1 1.9-.5 2.5-1.2z" />
      </svg>
    );
  }
  if (os === "windows") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden fill="currentColor">
        <path d="M1.5 2.3 7.2 1.5v6.1H1.5zm6.7-.9 6.3-.9v7.9H8.2zM1.5 8.6H7.2v6.2L1.5 14zm6.7.1h6.3v7.2l-6.3-.9z" />
      </svg>
    );
  }
  if (os === "linux") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden fill="currentColor">
        <path d="M8 1.4c-1.3 0-2.2 1.4-2.2 3.1 0 .7.2 1.6.5 2.2-.9.4-2 1.5-2 3 0 1.1.6 1.8 1.2 2.2-.1.3-.2.8-.2 1.2 0 1.2.7 2.1 2.7 2.1h.1c.7 0 1.3.2 1.9.2s1.2-.2 1.9-.2h.1c2 0 2.7-.9 2.7-2.1 0-.4-.1-.9-.2-1.2.6-.4 1.2-1.1 1.2-2.2 0-1.5-1.1-2.6-2-3 .3-.6.5-1.5.5-2.2C10.2 2.8 9.3 1.4 8 1.4zM6.6 5.4c.3 0 .5.4.5.9s-.2.9-.5.9-.6-.4-.6-.9.3-.9.6-.9zm2.8 0c.3 0 .6.4.6.9s-.3.9-.6.9-.5-.4-.5-.9.2-.9.5-.9z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden fill="none">
      <rect x="2.5" y="3.5" width="11" height="9" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 6.5h11" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
