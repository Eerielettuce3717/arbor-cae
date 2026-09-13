export function FeatureBento() {
  return (
    <section id="modules" className="scroll-mt-14 border-b border-rule" aria-labelledby="modules-heading">
      <div className="mx-auto grid max-w-sheet lg:grid-cols-12">
        <header className="border-b border-rule bg-ink px-[var(--gutter)] py-12 lg:col-span-4 lg:border-b-0 lg:border-r lg:py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-signal">
            On the machine
          </p>
          <h2 id="modules-heading" className="mt-4 font-display text-h2 text-paper">
            Four systems.
            <br />
            One document tree.
          </h2>
          <p className="mt-5 max-w-[36ch] text-mute">
            Part studios, assemblies, drawings, CAM, simulation, render, and PCB
            sit in the same local project. Check-in writes a SQLite revision, not
            a cloud commit.
          </p>
        </header>

        <div className="grid bg-ink lg:col-span-8 lg:grid-cols-8">
          <article className="border-b border-rule px-[var(--gutter)] py-10 lg:col-span-5 lg:border-r lg:px-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
              PDM
            </p>
            <h3 className="mt-2 font-display text-h3">Local-first versioning</h3>
            <p className="mt-3 max-w-[42ch] text-[0.98rem] leading-relaxed text-mute">
              Every check-in is a row in SQLite. WAL on disk, checkout on the
              feature tree, release states without an account. Path:
              <span className="text-paper"> .cad_workspace/*.cad_db</span>
            </p>
            <PdmGraph />
          </article>

          <article className="border-b border-rule px-[var(--gutter)] py-10 lg:col-span-3 lg:px-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
              ECAD
            </p>
            <h3 className="mt-2 font-display text-h3">Board in the same tree</h3>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-mute">
              Snap routing, DRC profiles, Gerber and Excellon out. Sized for a
              Voltera mill, not a fab portal.
            </p>
            <TraceMark />
          </article>

          <article className="border-b border-rule px-[var(--gutter)] py-10 lg:col-span-3 lg:border-b-0 lg:border-r lg:px-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
              Assembly
            </p>
            <h3 className="mt-2 font-display text-h3">Snap, then mate</h3>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-mute">
              Concentric and coincident snaps lock before the dialog stack
              appears. Instances stay in a local BOM.
            </p>
            <MateMark />
          </article>

          <article className="px-[var(--gutter)] py-10 lg:col-span-5 lg:px-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
              Sculpt
            </p>
            <h3 className="mt-2 font-display text-h3">T-spline cage</h3>
            <p className="mt-3 max-w-[46ch] text-[0.98rem] leading-relaxed text-mute">
              Control mesh in orange. Subdivided surface in vellum. Organic
              bodies sit next to BREP extrudes in the same studio, not a
              separate clay app.
            </p>
            <SplineMark />
          </article>
        </div>
      </div>
    </section>
  );
}

function PdmGraph() {
  const revs = [
    { n: "16", note: "HEAD  fillet R4", live: true },
    { n: "15", note: "hole Ø6.8", live: false },
    { n: "14", note: "extrude 8 mm", live: false },
    { n: "13", note: "sketch locked", live: false },
  ];
  return (
    <ol className="mt-8 border-t border-rule">
      {revs.map((rev) => (
        <li
          key={rev.n}
          className="flex min-h-11 items-center gap-4 border-b border-rule font-mono text-[11px]"
        >
          <span className={rev.live ? "text-signal" : "text-mute"}>r{rev.n}</span>
          <span className={rev.live ? "text-paper" : "text-mute"}>{rev.note}</span>
          {rev.live ? <span className="ml-auto text-signal">checked out</span> : null}
        </li>
      ))}
    </ol>
  );
}

function TraceMark() {
  return (
    <svg viewBox="0 0 180 88" className="mt-8 h-20 w-full text-paper" aria-hidden>
      <rect x="8" y="12" width="164" height="64" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="36" cy="44" r="8" fill="none" stroke="#E85D04" />
      <circle cx="144" cy="44" r="8" fill="none" stroke="#E85D04" />
      <path d="M44 44 H72 L96 28 H128 L136 44" fill="none" stroke="#E85D04" strokeWidth="2" />
      <path d="M44 44 H70 L90 60 H128" fill="none" stroke="#8B949E" />
    </svg>
  );
}

function MateMark() {
  return (
    <svg viewBox="0 0 160 80" className="mt-8 h-16 w-full" aria-hidden>
      <rect x="10" y="18" width="54" height="44" fill="none" stroke="#F3EEE6" />
      <rect x="86" y="18" width="54" height="44" fill="none" stroke="#F3EEE6" />
      <circle cx="64" cy="40" r="7" fill="none" stroke="#E85D04" />
      <circle cx="86" cy="40" r="7" fill="none" stroke="#E85D04" />
      <line x1="71" y1="40" x2="79" y2="40" stroke="#E85D04" />
      <text x="28" y="74" fill="#8B949E" fontSize="9" fontFamily="IBM Plex Mono, monospace">
        CONCENTRIC
      </text>
    </svg>
  );
}

function SplineMark() {
  return (
    <svg viewBox="0 0 280 92" className="mt-8 h-[4.5rem] w-full" aria-hidden>
      <path
        d="M12 70 C 48 70, 48 18, 92 18 S 140 70, 180 70 S 240 18, 268 28"
        fill="none"
        stroke="#F3EEE6"
        strokeWidth="1.6"
      />
      <path
        d="M12 70 L48 70 L92 18 L140 70 L180 70 L240 18 L268 28"
        fill="none"
        stroke="#E85D04"
        strokeWidth="1"
      />
      {[
        [12, 70],
        [48, 70],
        [92, 18],
        [140, 70],
        [180, 70],
        [240, 18],
        [268, 28],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 3} y={y - 3} width="6" height="6" fill="#E85D04" />
      ))}
    </svg>
  );
}
