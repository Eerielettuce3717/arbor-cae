import { DownloadStrip } from "@/components/ui/DownloadButton";
import { InteriorHeader, Prose, TextLink } from "@/components/Interior";
import { PageShell } from "@/components/PageShell";
import { pageMeta } from "@/lib/seo";
import {
  GITHUB_CLONE,
  GITHUB_URL,
  RELEASE_DOWNLOAD,
  RELEASE_DMG,
  RELEASE_TAG,
  ROUTES,
} from "@/lib/site";

export const metadata = pageMeta({
  title: "Download Arbor — macOS pre-release, or build from source",
  description:
    "Download the Arbor v0.1.0-pre.1 macOS disk image, or clone arbor-cae and compile the Tauri desktop app on Windows or Linux.",
  path: ROUTES.download,
});

export default function DownloadPage() {
  return (
    <PageShell crumbs={[{ name: "Download", path: ROUTES.download }]}>
      <main id="main">
        <InteriorHeader
          kicker={`Pre-release · ${RELEASE_TAG}`}
          title="Install Arbor on the machine that cuts"
          lede="The current GitHub pre-release ships a macOS Apple Silicon .dmg. Windows and Linux still compile from source. There is no app store account and no cloud activation."
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
              macOS (Apple Silicon):{" "}
              <TextLink href={RELEASE_DOWNLOAD.macos} external>
                {RELEASE_DMG}
              </TextLink>{" "}
              from{" "}
              <TextLink href={RELEASE_DOWNLOAD.index} external>
                {RELEASE_TAG}
              </TextLink>
              . The binary is unsigned. Gatekeeper will warn; open it from
              Finder with Control-click → Open if macOS blocks the first launch.
            </p>
            <p>
              Windows and Linux installers are not in this pre-release. Use the
              clone steps below. The release list is{" "}
              <TextLink href={`${GITHUB_URL}/releases`} external>
                GitHub Releases
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
