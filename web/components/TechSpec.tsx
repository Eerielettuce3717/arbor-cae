const ROWS = [
  {
    layer: "Window",
    stack: "Tauri 2",
    bound: "Native shell. No Electron tax.",
  },
  {
    layer: "Kernel I/O",
    stack: "Rust",
    bound: "PDM, CAM post, filesystem, workers.",
  },
  {
    layer: "Solids",
    stack: "OpenCASCADE",
    bound: "BREP, STEP, boolean, mesh buffers.",
  },
  {
    layer: "Viewport",
    stack: "WebGL / Three",
    bound: "GPU mesh, view cube, sketch overlay.",
  },
  {
    layer: "History",
    stack: "SQLite",
    bound: "Local revisions, WAL, release states.",
  },
  {
    layer: "ECAD",
    stack: "PixiJS + DRC",
    bound: "Snap routing. Gerber / Excellon.",
  },
  {
    layer: "CAM",
    stack: "2.5D pocket",
    bound: "Zigzag clear. Fanuc post.",
  },
];

export function TechSpec() {
  return (
    <section
      id="kernel"
      className="scroll-mt-14 border-b border-rule bg-ink"
      aria-labelledby="kernel-heading"
    >
      <div className="mx-auto grid max-w-sheet lg:grid-cols-12">
        <header className="px-[var(--gutter)] py-12 lg:col-span-4 lg:border-r lg:border-rule lg:py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-signal">
            Bill of materials
          </p>
          <h2 id="kernel-heading" className="mt-4 font-display text-h2">
            What the binary is made of
          </h2>
          <p className="mt-5 max-w-[36ch] text-mute">
            The landing page is Next.js. The product is not. Arbor runs as a
            Tauri desktop app with a Rust sidecar and an OpenCASCADE worker.
          </p>
          <pre className="mt-8 overflow-x-auto border border-rule bg-panel p-4 font-mono text-[12px] leading-relaxed text-paper">
            {`git clone \\
  https://github.com/Eerielettuce3717/cad_engine.git`}
          </pre>
        </header>

        <div className="lg:col-span-8">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left">
              <caption className="sr-only">
                Arbor runtime stack by subsystem
              </caption>
              <thead>
                <tr className="border-b border-rule font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                  <th scope="col" className="px-[var(--gutter)] py-3 font-medium lg:px-8">
                    Subsystem
                  </th>
                  <th scope="col" className="py-3 pr-6 font-medium">
                    Stack
                  </th>
                  <th scope="col" className="py-3 pr-[var(--gutter)] font-medium">
                    Bound to
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.layer} className="border-b border-rule last:border-b-0">
                    <th
                      scope="row"
                      className="px-[var(--gutter)] py-4 font-mono text-[13px] font-medium text-paper lg:px-8"
                    >
                      {row.layer}
                    </th>
                    <td className="py-4 pr-6 font-display text-[1.05rem] text-signal">
                      {row.stack}
                    </td>
                    <td className="py-4 pr-[var(--gutter)] text-[0.95rem] text-mute">
                      {row.bound}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
