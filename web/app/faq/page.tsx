import { JsonLd } from "@/components/JsonLd";
import { InteriorHeader, Prose, TextLink } from "@/components/Interior";
import { PageShell } from "@/components/PageShell";
import { pageMeta } from "@/lib/seo";
import { GITHUB_URL, ROUTES, SITE_URL } from "@/lib/site";

export const metadata = pageMeta({
  title: "Arbor FAQ — local files, formats, warranty, and hosting",
  description:
    "Straight answers about Arbor: where files live, what formats it writes, whether output is certified, and how this GitHub Pages site relates to the desktop app.",
  path: ROUTES.faq,
});

const ITEMS = [
  {
    q: "Does Arbor upload my designs?",
    a: "No. Check-in writes a local SQLite database in the Arbor app-data folder (on macOS: ~/Library/Application Support/Arbor). The desktop app does not send BREP, boards, or toolpaths to Arbor Contributors. If you upload a file yourself (GitHub, email, a drive), that is your transfer, not the kernel’s.",
  },
  {
    q: "Where do projects live?",
    a: "On disk under the Arbor application support directory (.cad_db SQLite). There is no hosted workspace and no account gate.",
  },
  {
    q: "What file formats can I take out?",
    a: "STEP for solids, Gerber and Excellon for boards, Fanuc-style NC from 2.5D pocket CAM. See the specs page for the rest of the stack.",
  },
  {
    q: "Is the output certified?",
    a: "No. Arbor is MIT-licensed engineering software under active development. Kernels, DRC, and posts can be wrong. Verify every dimension and toolpath before you cut or etch. The license page states the zero-warranty terms.",
  },
  {
    q: "Is this website the CAD application?",
    a: "No. This site is a static Next.js export on GitHub Pages. The product is a Tauri 2 desktop window. The marketing viewport is an SVG hex standoff, not the OpenCASCADE renderer.",
  },
  {
    q: "Which URL is the real site?",
    a: "The canonical site is arbor-cae.github.io. A mirror also lives at eerielettuce3717.github.io/. Project Pages still exist at eerielettuce3717.github.io/arbor-cae/. Nexus IDE is a separate project and only belongs at /nexus/.",
  },
  {
    q: "How do I install it?",
    a: "macOS, Windows, and Linux installers are on GitHub Releases as v0.1.0-pre.1 (Arbor.dmg, Arbor.msi, Arbor.AppImage). On macOS, if Gatekeeper says the app is damaged, run xattr -cr /Applications/Arbor.app then open it. You can also clone arbor-cae and run npm run tauri.",
  },
];

export default function FaqPage() {
  return (
    <PageShell crumbs={[{ name: "FAQ", path: ROUTES.faq }]}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: ITEMS.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.a,
            },
          })),
          url: `${SITE_URL}${ROUTES.faq}`,
        }}
      />
      <main id="main">
        <InteriorHeader
          kicker="Reference"
          title="Questions the kernel actually answers"
          lede="Short answers, no fake metrics. If a studio is still a scaffold, the modules page says so."
          aside={
            <p className="text-[0.95rem] text-mute">
              Still stuck? Open an issue on{" "}
              <TextLink href={GITHUB_URL} external>
                GitHub
              </TextLink>{" "}
              or read{" "}
              <TextLink href={ROUTES.specs}>specifications</TextLink>.
            </p>
          }
        />
        <article className="mx-auto max-w-sheet px-[var(--gutter)] py-12 lg:py-16">
          <Prose>
            {ITEMS.map((item) => (
              <section key={item.q} className="scroll-mt-16">
                <h2 className="font-display text-h3 text-paper">{item.q}</h2>
                <p>{item.a}</p>
              </section>
            ))}
            <p className="mt-10">
              Related:{" "}
              <TextLink href={ROUTES.about}>about</TextLink>,{" "}
              <TextLink href={ROUTES.modules}>modules</TextLink>,{" "}
              <TextLink href={ROUTES.download}>download</TextLink>,{" "}
              <TextLink href={ROUTES.privacy}>privacy</TextLink>.
            </p>
          </Prose>
        </article>
      </main>
    </PageShell>
  );
}
