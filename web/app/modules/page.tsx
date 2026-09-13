import { InteriorHeader, Prose, TextLink } from "@/components/Interior";
import { PageShell } from "@/components/PageShell";
import { pageMeta } from "@/lib/seo";
import { ROUTES } from "@/lib/site";

export const metadata = pageMeta({
  title: "Arbor modules — PDM, ECAD, assembly, sculpt, and CAM",
  description:
    "How Arbor keeps part studios, assemblies, boards, CAM, and sculpt in one local document tree with SQLite check-in.",
  path: ROUTES.modules,
});

const MODULES = [
  {
    id: "pdm",
    kicker: "PDM",
    title: "Local-first versioning",
    body: "Every check-in is a row in SQLite. WAL on disk, checkout on the feature tree, release states without an account. Path: .cad_workspace/*.cad_db",
  },
  {
    id: "ecad",
    kicker: "ECAD",
    title: "Board in the same tree",
    body: "Snap routing, DRC profiles, Gerber and Excellon out. The board is not a second vendor login. It sits next to the solid that will mill it.",
  },
  {
    id: "assembly",
    kicker: "Assembly",
    title: "Snap, then mate",
    body: "Concentric and coincident snaps lock before the dialog stack appears. Instances stay in a local BOM on this machine.",
  },
  {
    id: "sculpt",
    kicker: "Sculpt",
    title: "T-spline cage",
    body: "Control mesh and subdivided surface in the same studio as BREP extrudes. Organic bodies are not a separate clay app with a second license.",
  },
  {
    id: "cam",
    kicker: "CAM",
    title: "Stock, WCS, pocket",
    body: "2.5D zigzag clear and a Fanuc-style post. Verify on the controller. Arbor does not claim 5-axis or certified toolpaths.",
  },
  {
    id: "sim-render",
    kicker: "Sim / Render",
    title: "UI scaffolds",
    body: "Simulation and render studios exist as desktop UI scaffolds. They are listed here so the map is honest, not so a brochure can invent solvers.",
  },
];

export default function ModulesPage() {
  return (
    <PageShell crumbs={[{ name: "Modules", path: ROUTES.modules }]}>
      <main id="main">
        <InteriorHeader
          kicker="On the machine"
          title="Studios in one local document tree"
          lede="Part studios, assemblies, drawings, CAM, simulation, render, and PCB sit in the same project. Check-in writes a SQLite revision, not a cloud commit."
          aside={
            <p className="text-[0.95rem] text-mute">
              Runtime binding is on the{" "}
              <TextLink href={ROUTES.specs}>specs</TextLink> page. Installers
              are on <TextLink href={ROUTES.download}>download</TextLink>.
              How to patch:{" "}
              <TextLink href={ROUTES.contribute}>contribute</TextLink>.
            </p>
          }
        />
        <div className="mx-auto grid max-w-sheet lg:grid-cols-12">
          {MODULES.map((mod) => (
            <article
              key={mod.id}
              id={mod.id}
              className="scroll-mt-16 border-b border-rule px-[var(--gutter)] py-10 lg:col-span-6 lg:border-r lg:odd:border-r lg:[&:nth-last-child(-n+2)]:border-b-0"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                {mod.kicker}
              </p>
              <h2 className="mt-2 font-display text-h3 text-paper">{mod.title}</h2>
              <p className="mt-3 max-w-[46ch] text-[0.98rem] leading-relaxed text-mute">
                {mod.body}
              </p>
            </article>
          ))}
        </div>
        <article className="mx-auto max-w-sheet px-[var(--gutter)] py-12">
          <Prose>
            <p>
              The home page shows a compressed map of four of these systems.
              This page is the fuller list. Nothing here is a fake customer
              count. If a studio is still a scaffold, it is named as one.
            </p>
          </Prose>
        </article>
      </main>
    </PageShell>
  );
}
