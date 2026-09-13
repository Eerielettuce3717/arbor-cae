"use client";

import { CadViewport } from "./CadViewport";
import { DownloadStrip } from "./ui/DownloadButton";

export function Hero() {
  return (
    <section
      id="top"
      className="scroll-mt-14 border-b border-rule"
      aria-labelledby="hero-heading"
    >
      <DownloadStrip />
      <div className="mx-auto grid max-w-sheet lg:grid-cols-12">
        <div className="flex flex-col justify-between gap-12 border-b border-rule bg-ink px-[var(--gutter)] py-12 sm:py-16 lg:col-span-5 lg:border-b-0 lg:border-r lg:py-20">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-signal">
              Desktop kernel · open source
            </p>
            <h1
              id="hero-heading"
              className="mt-5 font-display text-display text-paper"
            >
              Parametric CAD.
              <br />
              Native ECAD.
              <br />
              Zero cloud.
            </h1>
            <p className="mt-7 max-w-[34ch] text-body text-mute">
              A local suite for parts, boards, and toolpaths. History lives in
              SQLite. Solids live in OpenCASCADE. The STEP file never phones
              home.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <a
              href="#kernel"
              className="inline-flex min-h-11 items-center justify-center border border-rule px-6 font-mono text-[11px] uppercase tracking-[0.16em] text-paper hover:border-paper"
            >
              See the stack
            </a>
            <a
              href="https://github.com/Eerielettuce3717/arbor-cae"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center border border-rule px-6 font-mono text-[11px] uppercase tracking-[0.16em] text-paper hover:border-paper"
            >
              Clone the kernel
            </a>
          </div>
        </div>

        <div className="bg-ink px-[var(--gutter)] py-8 lg:col-span-7 lg:py-10">
          <CadViewport />
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
            Drag height, bore, and across-flats. Switch Sketch / Solid / Trace / Path.
          </p>
        </div>
      </div>
    </section>
  );
}
