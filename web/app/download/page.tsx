import { DownloadStrip } from "@/components/ui/DownloadButton";
import { InteriorHeader, Prose, TextLink } from "@/components/Interior";
import { PageShell } from "@/components/PageShell";
import { pageMeta } from "@/lib/seo";
import { GITHUB_CLONE, GITHUB_URL, ROUTES } from "@/lib/site";

export const metadata = pageMeta({
  title: "Download Arbor — macOS, Windows, Linux, or build from source",
  description:
    "Get Arbor for macOS, Windows, or Linux from GitHub Releases, or clone the arbor-cae kernel and compile the Tauri desktop app yourself.",
  path: ROUTES.download,
});

export default function DownloadPage() {
  return (
    <PageShell crumbs={[{ name: "Download", path: ROUTES.download }]}>
      <main id="main">
        <InteriorHeader
          kicker="Releases"
          title="Install Arbor on the machine that cuts"
          lede="Builds come from GitHub Releases. If a platform asset is missing, clone the kernel and compile. There is no app store account and no cloud activation."
          aside={
            <p className="text-[0.95rem] text-mute">
              Read the{" "}
              <TextLink href={ROUTES.license}>license and disclaimer</TextLink>{" "}
              before you mill, etch, or assemble anything from Arbor output.
            </p>
          }
        />
        <DownloadStrip />
        <article className="mx-auto max-w-sheet px-[var(--gutter)] py-12 lg:py-16">
          <Prose>
            <h2 className="font-display text-h3 text-paper">Packaged builds</h2>
            <p>
              The orange control above picks macOS, Windows, or Linux from the
              browser. “Other platforms” lists all three installers. Files are
              served by GitHub, not by this Pages site.
            </p>
            <p>
              Direct latest release:{" "}
              <TextLink href={`${GITHUB_URL}/releases/latest`} external>
                github.com/Eerielettuce3717/arbor-cae/releases/latest
              </TextLink>
              .
            </p>

            <h2 className="mt-10 font-display text-h3 text-paper">
              Build from source
            </h2>
            <pre className="overflow-x-auto border border-rule bg-panel p-4 font-mono text-[12px] leading-relaxed text-paper">
              {`git clone ${GITHUB_CLONE}\ncd arbor-cae\nnpm install\nnpm run tauri`}
            </pre>
            <p>
              You need a current Node toolchain and the Tauri 2 / Rust
              prerequisites for your OS. The window crate is Tauri 2; kernel I/O
              is Rust; solids are OpenCASCADE. See{" "}
              <TextLink href={ROUTES.specs}>specifications</TextLink> for the
              rest of the bill of materials.
            </p>
            <p>
              Source repository:{" "}
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
