import { InteriorHeader, Prose, TextLink } from "@/components/Interior";
import { PageShell } from "@/components/PageShell";
import { pageMeta } from "@/lib/seo";
import { GITHUB_URL, ROUTES } from "@/lib/site";

export const metadata = pageMeta({
  title: "Arbor license — MIT terms and zero-warranty disclaimer",
  description:
    "Arbor is MIT-licensed CAD, CAM, and ECAD with no warranty. Contributors are not liable for parts, boards, toolpaths, or injuries from your work.",
  path: ROUTES.license,
});

export default function LicensePage() {
  return (
    <PageShell crumbs={[{ name: "License", path: ROUTES.license }]}>
      <main id="main">
        <InteriorHeader
          kicker="Legal · MIT"
          title="MIT license and zero-warranty terms"
          lede="You may use, copy, modify, and distribute Arbor under the MIT License. You also accept that output is unverified and that liability stays with you."
          aside={
            <ul className="space-y-6">
              <li>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                  SPDX
                </p>
                <p className="mt-1 font-display text-paper">MIT</p>
              </li>
              <li>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                  Copyright
                </p>
                <p className="mt-1 font-display text-paper">
                  2026 Arbor Contributors
                </p>
              </li>
            </ul>
          }
        />
        <article className="mx-auto max-w-sheet px-[var(--gutter)] py-12 lg:py-16">
          <Prose>
            <h2 className="font-display text-h3 text-paper">Permission</h2>
            <p>
              Permission is granted, free of charge, to deal in the software
              without restriction, including use, copy, modify, merge, publish,
              distribute, sublicense, and sell, subject to including the
              copyright and permission notice. The full text is in{" "}
              <TextLink href={`${GITHUB_URL}/blob/main/LICENSE`} external>
                LICENSE
              </TextLink>{" "}
              in the repository.
            </p>

            <h2 className="mt-10 font-display text-h3 text-paper">
              No warranty
            </h2>
            <p>
              The software is provided “as is”, without warranty of any kind,
              express or implied, including merchantability, fitness for a
              particular purpose, and non-infringement. In no event are the
              authors or copyright holders liable for any claim, damages, or
              other liability.
            </p>

            <h2 className="mt-10 font-display text-h3 text-paper">
              Extra disclaimer
            </h2>
            <p>
              Arbor Contributors assume no responsibility for parts, boards,
              toolpaths, simulations, injuries, scrap, or IP claims that come
              from your use of the software. Do not treat kernel output as
              certified. The longer text is{" "}
              <TextLink href={`${GITHUB_URL}/blob/main/DISCLAIMER.md`} external>
                DISCLAIMER.md
              </TextLink>
              . Website use is also covered by the{" "}
              <TextLink href={ROUTES.terms}>Terms of Service</TextLink> and{" "}
              <TextLink href={ROUTES.privacy}>Privacy Policy</TextLink>.
            </p>
          </Prose>
        </article>
      </main>
    </PageShell>
  );
}
