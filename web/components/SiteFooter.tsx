import { DownloadStrip } from "./ui/DownloadButton";
import { Logo } from "./Mark";

export function SiteFooter() {
  return (
    <footer className="bg-ink">
      <DownloadStrip />
      <div className="mx-auto grid max-w-sheet lg:grid-cols-12">
      <div className="flex items-start gap-3 border-b border-rule px-[var(--gutter)] py-10 lg:col-span-5 lg:border-b-0 lg:border-r lg:py-12">
        <div>
          <Logo
            markClassName="h-8 w-8 shrink-0"
            nameClassName="font-display text-[1.15rem] font-medium tracking-[-0.02em] text-paper"
          />
          <p className="mt-2 max-w-[34ch] pl-11 text-[0.95rem] text-mute">
            Open-source desktop CAD, CAM, and ECAD. Built to stay on the bench,
            not in someone else&apos;s region.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px bg-rule sm:grid-cols-4 lg:col-span-7">
        <FooterCell label="Sheet" value="1 / 1" />
        <FooterCell label="Scale" value="1:1" />
        <FooterCell label="Rev" value="A" />
        <a
          href="https://github.com/Eerielettuce3717/cad_engine"
          target="_blank"
          rel="noreferrer"
          className="bg-ink px-[var(--gutter)] py-8 hover:bg-panel sm:px-6"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">Source</p>
          <p className="mt-2 font-display text-paper">GitHub ↗</p>
        </a>
      </div>
      </div>
    </footer>
  );
}

function FooterCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink px-[var(--gutter)] py-8 sm:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">{label}</p>
      <p className="mt-2 font-display text-paper">{value}</p>
    </div>
  );
}
