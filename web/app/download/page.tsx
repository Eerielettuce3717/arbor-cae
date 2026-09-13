import { DownloadStrip } from "@/components/ui/DownloadButton";
import { InteriorHeader, Prose, TextLink } from "@/components/Interior";
import { PageShell } from "@/components/PageShell";
import { pageMeta } from "@/lib/seo";
import {
  GITHUB_CLONE,
  GITHUB_URL,
  RELEASE_ASSETS,
  RELEASE_DOWNLOAD,
  RELEASE_TAG,
  ROUTES,
} from "@/lib/site";

export const metadata = pageMeta({
  title: "Download Arbor — macOS, Windows, and Linux pre-release",
  description:
    "Download Arbor v0.1.0-pre.3 for macOS, Windows, or Linux from GitHub Releases, or clone arbor-cae and compile the Tauri desktop app yourself.",
  path: ROUTES.download,
});

export default function DownloadPage() {
  return (
    <PageShell crumbs={[{ name: "Download", path: ROUTES.download }]}>
      <main id="main">
        <InteriorHeader
          kicker={`Pre-release · ${RELEASE_TAG}`}
          title="Install Arbor on the machine that cuts"
          lede="The current GitHub pre-release ships macOS, Windows, and Linux installers. There is no app store account and no cloud activation."
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
            <ul className="list-disc space-y-2 pl-5">
              <li>
                macOS (Apple Silicon):{" "}
                <TextLink href={RELEASE_DOWNLOAD.macos} external>
                  {RELEASE_ASSETS.macos}
                </TextLink>
                . Unsigned pre-release. If macOS says the app is “damaged”, that
                is Gatekeeper quarantine — not a corrupt download. After
                installing to Applications, run{" "}
                <code className="font-mono text-[0.9em] text-signal">
                  xattr -cr /Applications/Arbor.app
                </code>
                , then open the app (or Control-click → Open).
              </li>
              <li>
                Windows (x64):{" "}
                <TextLink href={RELEASE_DOWNLOAD.windows} external>
                  {RELEASE_ASSETS.windows}
                </TextLink>
                . SmartScreen may warn; More info → Run anyway.
              </li>
              <li>
                Linux (x64 AppImage):{" "}
                <TextLink href={RELEASE_DOWNLOAD.linux} external>
                  {RELEASE_ASSETS.linux}
                </TextLink>
                . chmod +x, then run.
              </li>
            </ul>
            <p>
              Files live on{" "}
              <TextLink href={RELEASE_DOWNLOAD.index} external>
                {RELEASE_TAG}
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
              prerequisites for your OS. See{" "}
              <TextLink href={ROUTES.specs}>specifications</TextLink>. Source:{" "}
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
