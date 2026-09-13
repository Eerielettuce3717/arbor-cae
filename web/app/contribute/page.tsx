import { InteriorHeader, Prose, TextLink } from "@/components/Interior";
import { PageShell } from "@/components/PageShell";
import { pageMeta } from "@/lib/seo";
import { GITHUB_CLONE, GITHUB_ISSUES, GITHUB_URL, ROUTES } from "@/lib/site";

export const metadata = pageMeta({
  title: "Contribute to Arbor — issues, patches, and local builds",
  description:
    "How to report bugs, open pull requests, and compile Arbor from the arbor-cae repository. The desktop app is Tauri 2; this website is a static Next.js export.",
  path: ROUTES.contribute,
});

export default function ContributePage() {
  return (
    <PageShell crumbs={[{ name: "Contribute", path: ROUTES.contribute }]}>
      <main id="main">
        <InteriorHeader
          kicker="Source · public"
          title="Patch the kernel on this machine"
          lede="Arbor is MIT-licensed. There is no contributor portal and no CLA. File an issue, send a pull request, or fork the crate. Builds happen on your disk."
          aside={
            <ul className="space-y-6">
              <li>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                  Issues
                </p>
                <TextLink href={GITHUB_ISSUES} external>
                  arbor-cae/issues
                </TextLink>
              </li>
              <li>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                  Clone
                </p>
                <p className="mt-1 font-mono text-[12px] text-paper">
                  git clone arbor-cae.git
                </p>
              </li>
            </ul>
          }
        />
        <article className="mx-auto max-w-sheet px-[var(--gutter)] py-12 lg:py-16">
          <Prose>
            <h2 className="font-display text-h3 text-paper">Two codebases</h2>
            <p>
              The product is the Tauri desktop app in the repository root. Dev
              server: Vite on port 1420, window title Arbor. The marketing site
              lives in <code className="font-mono text-paper">web/</code> and is
              a Next.js static export. Do not mix those tabs. This website is
              not the CAD kernel.
            </p>

            <h2 className="mt-10 font-display text-h3 text-paper">
              Desktop app
            </h2>
            <pre className="overflow-x-auto border border-rule bg-panel p-4 font-mono text-[12px] leading-relaxed text-paper">
              {`git clone ${GITHUB_CLONE}
cd arbor-cae
npm install
npm run tauri`}
            </pre>
            <p>
              You need Node, a Rust toolchain, and the Tauri 2 prerequisites
              for your OS. OpenCASCADE.js ships as a WASM worker. Details sit
              on the <TextLink href={ROUTES.specs}>specs</TextLink> page.
              Packaged installers, when present, are on{" "}
              <TextLink href={ROUTES.download}>download</TextLink>.
            </p>

            <h2 className="mt-10 font-display text-h3 text-paper">
              This website
            </h2>
            <pre className="overflow-x-auto border border-rule bg-panel p-4 font-mono text-[12px] leading-relaxed text-paper">
              {`cd web
npm install
npm run dev`}
            </pre>
            <p>
              Static export: <code className="font-mono text-paper">npm run build</code>{" "}
              inside <code className="font-mono text-paper">web/</code>. GitHub
              Pages serves the <code className="font-mono text-paper">out/</code>{" "}
              folder. Canonical host:{" "}
              <TextLink href={ROUTES.home}>eerielettuce3717.github.io</TextLink>.
            </p>

            <h2 className="mt-10 font-display text-h3 text-paper">
              What to send
            </h2>
            <p>
              Bugs, patches, and questions go to{" "}
              <TextLink href={GITHUB_ISSUES} external>
                GitHub issues
              </TextLink>
              . Do not paste proprietary geometry. Read the{" "}
              <TextLink href={ROUTES.license}>license</TextLink> and{" "}
              <TextLink href={ROUTES.terms}>terms</TextLink> before you
              contribute. Repository:{" "}
              <TextLink href={GITHUB_URL} external>
                Eerielettuce3717/arbor-cae
              </TextLink>
              .
            </p>
          </Prose>
        </article>
      </main>
    </PageShell>
  );
}
