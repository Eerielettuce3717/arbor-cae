import { InteriorHeader, Prose, TextLink } from "@/components/Interior";
import { PageShell } from "@/components/PageShell";
import { pageMeta } from "@/lib/seo";
import { GITHUB_CLONE, GITHUB_URL, ROUTES } from "@/lib/site";

export const metadata = pageMeta({
  title: "Arbor specifications — kernel, formats, and desktop runtime",
  description:
    "In-depth Arbor specs: Tauri 2 window, Rust PDM, OpenCASCADE.js solids, Three.js viewport, PixiJS ECAD, 2.5D CAM, SQLite schema, DRC limits, and file formats that stay on disk.",
  path: ROUTES.specs,
});

const STACK = [
  {
    id: "window",
    title: "Window shell",
    spec: "Tauri 2",
    bound: "Native OS window. No Electron.",
    body: "The binary identifier is com.cadengine.app. Product name Arbor, version 0.1.0. Default window 1440×900, minimum 1100×700, centered, decorations on, drag-and-drop on. macOS minimum system version 10.15. Windows webview bootstrapper downloads if WebView2 is missing. Linux ships AppImage, deb, and rpm targets. Content security policy allows self, wasm-unsafe-eval, blob workers, and Tauri IPC — not arbitrary network geometry.",
  },
  {
    id: "frontend",
    title: "Desktop UI",
    spec: "React 19 + Zustand",
    bound: "Part studio, assembly, drawings, PCB, CAM, settings.",
    body: "The desktop renderer is a Vite webview, not this Next.js site. Viewport graphics use Three.js. PCB canvas uses PixiJS 8. State lives in Zustand stores (features, sketch, assembly, PCB, CAM, simulation, render). Lucide icons. That Vite tab is titled Arbor in tauri.conf.json. This marketing site is a separate Next.js export.",
  },
  {
    id: "kernel",
    title: "Kernel I/O",
    spec: "Rust (cad_engine_lib)",
    bound: "PDM, filesystem, workers, commands.",
    body: "The sidecar crate is still named cad_engine_lib inside arbor-cae. Dependencies: rusqlite 0.32 (bundled), serde, uuid v4, chrono, parking_lot, thiserror. Release profile: LTO, abort on panic, single codegen unit. Commands are Tauri-invoked; they do not phone a CAD cloud.",
  },
  {
    id: "solids",
    title: "Solids",
    spec: "OpenCASCADE.js",
    bound: "BREP, STEP, boolean, mesh buffers.",
    body: "The kernel worker (src/workers/cadWorker.ts) talks to OpenCASCADE.js 2.0 beta. Mesh buffers feed the Three.js viewport. Parametric history is local to the feature tree and the SQLite commit, not a hosted document. The SVG hex standoff on the home page is a marketing stand-in, not this worker.",
  },
  {
    id: "viewport",
    title: "Viewport",
    spec: "WebGL / Three.js",
    bound: "GPU mesh, view cube, sketch overlay.",
    body: "src/components/viewport/Viewport3D.tsx plus a view cube and Onshape-style orbit controls. Sketch overlay is 2D inference in the part studio. An AR viewport file exists as a scaffold only — it is not a shipping headset mode.",
  },
  {
    id: "history",
    title: "History / PDM",
    spec: "SQLite",
    bound: "WAL on disk. Checkout on the tree.",
    body: "Path: .cad_workspace/*.cad_db. Schema tables include projects, branches, commits (parent and merge parent), document_state (feature_tree JSON, content_hash), document_notes, properties_metadata, workspace_locks, plus release and version helpers in Rust. Foreign keys on. Every check-in is a row, not a cloud commit.",
  },
  {
    id: "ecad",
    title: "ECAD",
    spec: "PixiJS + DRC",
    bound: "Snap routing. Gerber / Excellon.",
    body: "2D PCB canvas with snap routing. Exporters write Gerber copper and Excellon drills. DRC ships two named profiles: Standard Fab (0.15 mm trace/clearance, 0.3 mm drill, 0.1 mm annular, 0.4 mm pin pitch) and Additive / Conductive Ink (0.2 mm traces, 0.4 mm drill, 0.15 mm annular). Profiles are starting points. Read them before you mill.",
  },
  {
    id: "cam",
    title: "CAM",
    spec: "2.5D pocket",
    bound: "Zigzag clear. Fanuc post.",
    body: "Stock, WCS, tool definition, and pocket parameters live in the CAM store. pocketClearing.ts emits the zigzag. fanucPost.ts writes ISO G-code (.nc) with program number, absolute/incremental, mm units, and safe Z. This is not 5-axis. Verify on the controller.",
  },
  {
    id: "assembly",
    title: "Assembly",
    spec: "Local BOM + mates",
    bound: "Concentric / coincident snaps.",
    body: "Instances stay in a local bill of materials. mateMath.ts handles concentric and coincident solves. There is no PDM server locking your assembly in a region.",
  },
  {
    id: "sculpt",
    title: "Sculpt",
    spec: "T-spline cage",
    bound: "Subdivision in the same studio.",
    body: "FormWorkspace plus subdivision.ts. Control cage and subdivided surface sit next to BREP extrudes. Not a second clay application.",
  },
];

const FORMATS = [
  { name: ".cad_db", use: "Local project database (SQLite, WAL)." },
  { name: "STEP", use: "BREP interchange through OpenCASCADE." },
  { name: "Gerber", use: "Copper layers for mill or fab." },
  { name: "Excellon", use: "Drill files alongside Gerber." },
  { name: "Fanuc NC (.nc)", use: "Posted 2.5D pocket toolpaths." },
];

const LIMITS = [
  {
    title: "Scaffolds",
    body: "Simulation and render studios exist as desktop UI. AR viewport is a scaffold. Do not treat them as certified solvers or a shipped headset mode.",
  },
  {
    title: "CAM envelope",
    body: "2.5D pocket only. No 5-axis, no machine kinematics model, no collision certification.",
  },
  {
    title: "DRC",
    body: "Two manufacturing profiles. They do not replace a fab’s current capabilities list.",
  },
  {
    title: "Hardware",
    body: "Any machine that can run a Tauri 2 webview with WebGL and a WASM worker. There is no hosted GPU.",
  },
];

export default function SpecsPage() {
  return (
    <PageShell crumbs={[{ name: "Specs", path: ROUTES.specs }]}>
      <main id="main">
        <InteriorHeader
          kicker="Bill of materials · software"
          title="Kernel, formats, and the desktop runtime"
          lede="Version 0.1.0. Numbers below are subsystem names and real limits from the arbor-cae tree, not marketing counts. If a layer is still a scaffold, it is listed as one."
          aside={
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                Clone
              </p>
              <pre className="mt-3 overflow-x-auto border border-rule bg-panel p-4 font-mono text-[12px] leading-relaxed text-paper">
                {`git clone \\\n  ${GITHUB_CLONE}`}
              </pre>
              <p className="mt-4 text-[0.95rem] text-mute">
                Source:{" "}
                <TextLink href={GITHUB_URL} external>
                  arbor-cae on GitHub
                </TextLink>
                . Also{" "}
                <TextLink href={ROUTES.modules}>modules</TextLink>,{" "}
                <TextLink href={ROUTES.contribute}>contribute</TextLink>,{" "}
                <TextLink href={ROUTES.download}>download</TextLink>.
              </p>
            </div>
          }
        />

        <div className="mx-auto max-w-sheet">
          <div className="overflow-x-auto border-b border-rule">
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
                {STACK.map((row) => (
                  <tr key={row.id} className="border-b border-rule">
                    <th
                      scope="row"
                      className="px-[var(--gutter)] py-4 font-mono text-[13px] font-medium text-paper lg:px-8"
                    >
                      <a href={`#${row.id}`} className="hover:text-signal">
                        {row.title}
                      </a>
                    </th>
                    <td className="py-4 pr-6 font-display text-[1.05rem] text-signal">
                      {row.spec}
                    </td>
                    <td className="py-4 pr-[var(--gutter)] text-[0.95rem] text-mute">
                      {row.bound}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <article className="px-[var(--gutter)] py-12 lg:py-16">
            <Prose>
              {STACK.map((row) => (
                <section key={row.id} id={row.id} className="scroll-mt-16">
                  <h2 className="font-display text-h3 text-paper">
                    {row.title}
                  </h2>
                  <p>
                    <span className="text-signal">{row.spec}.</span> {row.body}
                  </p>
                </section>
              ))}

              <h2 id="formats" className="mt-10 font-display text-h3 text-paper">
                File formats
              </h2>
              <p>
                Arbor does not invent a cloud package format. Interchange is
                ordinary CAD and PCB files plus one local database.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                {FORMATS.map((item) => (
                  <li key={item.name}>
                    <strong className="font-medium text-paper">{item.name}</strong>
                    {" — "}
                    {item.use}
                  </li>
                ))}
              </ul>

              <h2 id="drc" className="mt-10 font-display text-h3 text-paper">
                DRC numeric limits
              </h2>
              <p>
                Standard Fab: 0.15 mm minimum trace and clearance, 0.3 mm
                drill, 0.1 mm annular ring, 0.4 mm pin pitch, board bounds
                enforced. Additive / conductive ink: 0.2 mm traces and
                clearance, 0.4 mm drill, 0.15 mm annular, 0.4 mm pin pitch.
                Both profiles live in{" "}
                <code className="font-mono text-paper">src/pcb/drc/profiles.ts</code>.
              </p>

              <h2 id="limits" className="mt-10 font-display text-h3 text-paper">
                Honest limits
              </h2>
              {LIMITS.map((item) => (
                <p key={item.title}>
                  <strong className="font-medium text-paper">{item.title}.</strong>{" "}
                  {item.body}
                </p>
              ))}
              <p>
                Do not treat output as certified. The{" "}
                <TextLink href={ROUTES.license}>disclaimer</TextLink> and{" "}
                <TextLink href={ROUTES.terms}>terms</TextLink> apply. Build
                notes are on{" "}
                <TextLink href={ROUTES.contribute}>contribute</TextLink>.
              </p>
            </Prose>
          </article>
        </div>
      </main>
    </PageShell>
  );
}
