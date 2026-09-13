import { InteriorHeader, Prose, TextLink } from "@/components/Interior";
import { PageShell } from "@/components/PageShell";
import { pageMeta } from "@/lib/seo";
import { GITHUB_URL, ROUTES } from "@/lib/site";

export const metadata = pageMeta({
  title: "About Arbor — local-first CAD from the bench",
  description:
    "Why Arbor exists: a local-first CAD, CAM, and ECAD suite that keeps solids, boards, and history on the machine that makes the part.",
  path: ROUTES.about,
});

export default function AboutPage() {
  return (
    <PageShell crumbs={[{ name: "About", path: ROUTES.about }]}>
      <main id="main">
        <InteriorHeader
          kicker="Project · Rev A"
          title="Built to stay on this machine"
          lede="Arbor is an open-source desktop CAD, CAM, and ECAD suite. It is not a browser CAD portal, not a seat license, and not a region in someone else’s cloud."
          aside={
            <ul className="space-y-6">
              <li>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                  License
                </p>
                <p className="mt-1 font-display text-paper">MIT</p>
              </li>
              <li>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                  Operator
                </p>
                <p className="mt-1 font-display text-paper">Arbor Contributors</p>
              </li>
              <li>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                  Source
                </p>
                <TextLink href={GITHUB_URL} external>
                  github.com/Eerielettuce3717/arbor-cae
                </TextLink>
              </li>
            </ul>
          }
        />

        <article className="mx-auto max-w-sheet px-[var(--gutter)] py-12 lg:py-16">
          <Prose>
            <h2 className="font-display text-h3 text-paper">What Arbor is</h2>
            <p>
              Arbor is a Tauri desktop application with a Rust sidecar and an
              OpenCASCADE worker. You model parts, mate assemblies, route boards,
              and post toolpaths in one local document tree. Check-in writes a
              SQLite revision. The{" "}
              <code className="font-mono text-paper">.cad_db</code> file never
              phones home.
            </p>
            <p>
              The marketing site you are reading is Next.js, exported to GitHub
              Pages. That is not the product. The product does not require this
              website to run.
            </p>

            <h2 className="mt-10 font-display text-h3 text-paper">
              Why local-first
            </h2>
            <p>
              Geometry is IP. A feature tree, a mill setup, and a board layout
              should not be a subscription hostage. Arbor keeps BREP, sketches,
              traces, and history on disk so a shop can work without an account,
              a region pin, or a vendor outage.
            </p>
            <p>
              That also means we cannot see your files, recover them for you, or
              certify a part. Read the{" "}
              <TextLink href={ROUTES.license}>license and disclaimer</TextLink>{" "}
              before you cut metal.
            </p>

            <h2 className="mt-10 font-display text-h3 text-paper">
              Who maintains it
            </h2>
            <p>
              Arbor Contributors maintain the public repository under California
              governing law for the website terms. There is no company storefront
              and no support desk. Bugs and patches go through{" "}
              <TextLink href={GITHUB_URL} external>
                GitHub
              </TextLink>
              .
            </p>

            <h2 className="mt-10 font-display text-h3 text-paper">
              Where to go next
            </h2>
            <p>
              Read the{" "}
              <TextLink href={ROUTES.specs}>runtime specifications</TextLink>,
              the{" "}
              <TextLink href={ROUTES.modules}>module map</TextLink>, the{" "}
              <TextLink href={ROUTES.faq}>FAQ</TextLink>, or{" "}
              <TextLink href={ROUTES.download}>download a build</TextLink>.{" "}
              <TextLink href={ROUTES.contribute}>Contribute</TextLink> if you
              would rather compile it yourself.
            </p>
          </Prose>
        </article>
      </main>
    </PageShell>
  );
}
