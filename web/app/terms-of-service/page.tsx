import { pageMeta } from "@/lib/seo";
import { ROUTES } from "@/lib/site";
import { LegalCallout, LegalDoc, LegalSection } from "@/components/LegalDoc";
import { LEGAL } from "@/lib/legal";

export const metadata = pageMeta({
  title: "Terms of Service — Arbor CAD, CAM, and ECAD",
  description:
    "Acceptable use, intellectual-property rules, and limitation of liability for Arbor, the local-first CAD, CAM, and ECAD suite.",
  path: ROUTES.terms,
});

const TOC = [
  { id: "agreement", label: "Agreement" },
  { id: "acceptable-use", label: "Acceptable use" },
  { id: "ip-infringement", label: "Intellectual property infringement" },
  { id: "software-ip", label: "Software IP protection" },
  { id: "ugc", label: "User-generated content" },
  { id: "as-is", label: "Disclaimer of warranties" },
  { id: "liability", label: "Limitation of liability" },
  { id: "indemnity", label: "Indemnification" },
  { id: "export", label: "Export and sanctions" },
  { id: "law", label: "Governing law" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export default function TermsOfServicePage() {
  return (
    <LegalDoc
      docId="AR-TOS-001"
      kicker="Legal · Rev A"
      title="Terms of Service"
      lede={`${LEGAL.product} is a local-first CAD, CAM, and ECAD suite. These terms govern the website, downloads, and software. If you cannot accept them, do not use ${LEGAL.product}.`}
      toc={TOC}
      crumbHref={ROUTES.terms}
    >
      <LegalSection id="agreement" title="1. Agreement">
        <p>
          These Terms of Service (the “Terms”) are a binding agreement between you
          and {LEGAL.operator} (“we,” “us”) covering the {LEGAL.product} desktop
          application, this website, documentation, and source code made available
          at{" "}
          <a href={LEGAL.github} className="text-paper underline decoration-rule underline-offset-4 hover:text-signal">
            GitHub
          </a>{" "}
          (together, the “Services”).
        </p>
        <p>
          By visiting this site, downloading a build, cloning the repository, or
          running {LEGAL.product}, you agree to these Terms, the{" "}
          <a href={ROUTES.privacy} className="text-paper underline decoration-rule underline-offset-4 hover:text-signal">
            Privacy Policy
          </a>
          , the MIT License in the repository, and{" "}
          <code className="font-mono text-[0.9em] text-paper">DISCLAIMER.md</code>.
          If you use {LEGAL.product} on behalf of an organization, you represent
          that you have authority to bind it.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="2. Acceptable use">
        <LegalCallout
          kicker="Critical — prohibited designs"
          title="No illegal items. No unauthorized weapons."
        >
          <p>
            You may not use {LEGAL.product} to design, prototype, manufacture,
            simulate, document, or distribute illegal items, including but not
            limited to unauthorized firearms, weapons, explosive devices, or other
            illicit physical devices.
          </p>
          <p>
            <strong className="font-medium text-paper">
              The creator of {LEGAL.product} completely condemns and does not
              condone any illegal use of this software.
            </strong>{" "}
            {LEGAL.product} is a general-purpose engineering tool. Providing it is
            not permission, encouragement, or assistance to break any law.
          </p>
        </LegalCallout>
        <p>You also agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Use the Services in violation of applicable criminal, export, sanctions,
            firearms, product-safety, or dual-use laws in any jurisdiction that
            applies to you.
          </li>
          <li>
            Circumvent, disable, or attack security, licensing, or consent
            mechanisms on this website.
          </li>
          <li>
            Scrape, overload, or interfere with the website or GitHub releases
            except as allowed by robots.txt and the GitHub Terms of Service.
          </li>
          <li>
            Misrepresent {LEGAL.product} output as certified, ITAR-cleared,
            FAA/FDA-approved, or otherwise regulated without independent
            qualification by a competent professional.
          </li>
        </ul>
        <p>
          We may refuse downloads, issue notices, or cooperate with lawful
          requests if we reasonably believe these rules are being broken. Because
          the desktop app is local-first, we typically cannot see or police your
          files — that does not make prohibited use allowed.
        </p>
      </LegalSection>

      <LegalSection
        id="ip-infringement"
        title="3. Intellectual property infringement"
      >
        <p>
          You may not use {LEGAL.product} to reverse-engineer, copy, clone, or
          otherwise infringe existing patents, trademarks, copyrights, trade
          dress, or copyrighted physical designs belonging to others.
        </p>
        <p>
          That includes, without limitation, reproducing a competitor’s part,
          housing, logo, board layout, or tooling in order to knock it off;
          extracting proprietary geometry from files you are not licensed to use;
          and generating derivatives that would infringe a valid IP right.
        </p>
        <p>
          You are solely responsible for clearing rights in every design you
          create or manufacture. We do not review user models and do not grant
          any license to third-party intellectual property.
        </p>
      </LegalSection>

      <LegalSection id="software-ip" title="4. Software IP protection">
        <p>
          The {LEGAL.product} <strong className="font-medium text-paper">source code</strong>{" "}
          is open source under the MIT License in the public repository. You may
          use, modify, and redistribute that code only under that license,
          including its copyright notice and{" "}
          <strong className="font-medium text-paper">AS IS / limitation of liability</strong>{" "}
          clauses.
        </p>
        <p>
          The brand name <strong className="font-medium text-paper">{LEGAL.product}</strong>,
          wordmark, logomark, color system, and this website’s design, copy, and
          layout remain the exclusive intellectual property of {LEGAL.operator}.
          Open source does not mean the brand is free to take.
        </p>
        <p>You may not, without prior written permission:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Use “{LEGAL.product}” or confusingly similar branding to name a
            competing product, fork, or commercial offering.
          </li>
          <li>
            Use the mark, orange “Y” logomark, or website design in a way that
            suggests endorsement, certification, or official affiliation.
          </li>
          <li>
            Remove copyright, license, or disclaimer notices from source
            distributions.
          </li>
        </ul>
        <p>
          Forks must not impersonate the upstream project. Attribution under MIT
          is required; brand use is not granted by MIT.
        </p>
      </LegalSection>

      <LegalSection id="ugc" title="5. User-generated content">
        <LegalCallout
          tone="paper"
          kicker="Local-first"
          title="Your .cad_db files stay on your machine."
        >
          <p>
            You retain all rights to designs, geometry, boards, toolpaths, and
            other files you create with {LEGAL.product}. We do not host them, we
            do not have access to them, and we do not claim ownership of them.
          </p>
        </LegalCallout>
        <p>
          {LEGAL.product} stores projects locally (including SQLite history such
          as <code className="font-mono text-[0.9em] text-paper">.cad_db</code>{" "}
          files). Unless you separately upload a file to a third party (for
          example GitHub, email, or a cloud drive), those files never leave your
          computer through {LEGAL.product}.
        </p>
        <p>
          If you open a pull request, file an issue, or otherwise send us
          materials, you grant {LEGAL.operator} a non-exclusive license to use
          that submission to operate and improve the project, subject to the
          repository’s contribution terms. Do not send confidential designs.
        </p>
      </LegalSection>

      <LegalSection id="as-is" title="6. Disclaimer of warranties">
        <p className="font-medium uppercase tracking-wide text-paper">
          The Services are provided “AS IS” and “AS AVAILABLE,” without warranties
          of any kind, whether express, implied, or statutory.
        </p>
        <p>
          That includes implied warranties of merchantability, fitness for a
          particular purpose, title, non-infringement, accuracy of geometry, and
          uninterrupted or error-free operation. {LEGAL.product} is engineering
          software under active development. Kernels, CAM posts, DRC, and
          exporters can be wrong.
        </p>
        <p>
          You must independently verify every dimension, tolerance, toolpath,
          net, and fabrication output before manufacturing. Nothing here is
          professional engineering, safety, or legal advice.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="7. Limitation of liability">
        <LegalCallout kicker="Read this twice" title="We are not liable for crashed jobs or ruined parts.">
          <p className="font-medium uppercase tracking-wide text-paper">
            To the fullest extent permitted by law, {LEGAL.operator}, the
            creator, maintainers, and contributors shall not be liable for any
            indirect, incidental, special, consequential, exemplary, or punitive
            damages, or any loss of profits, data, goodwill, or business, arising
            out of or related to the Services.
          </p>
          <p>
            This includes, without limitation: software crashes; lost, corrupted,
            or unrecoverable CAD files and databases; manufacturing errors; ruined
            CNC or 3D-printing jobs; scrap; machine collisions; tool breakage;
            downtime; missed deliveries; and physical harm or property damage
            connected to parts you design or make.
          </p>
          <p>
            Aggregate liability for any claim relating to the Services will not
            exceed the greater of (a) amounts you paid us for the Services in the
            twelve months before the claim (typically zero) or (b) one hundred
            U.S. dollars (US $100), except where a statute forbids this cap.
          </p>
        </LegalCallout>
        <p>
          Some jurisdictions do not allow certain limitations. In those places,
          the limits apply to the maximum extent allowed. You assume all risk of
          production use.
        </p>
      </LegalSection>

      <LegalSection id="indemnity" title="8. Indemnification">
        <p>
          You will defend, indemnify, and hold harmless {LEGAL.operator} and
          contributors from claims, damages, losses, and expenses (including
          reasonable attorneys’ fees) arising out of: your use of {LEGAL.product};
          your designs and manufactured objects; your violation of these Terms or
          the law; or your infringement of another party’s rights.
        </p>
      </LegalSection>

      <LegalSection id="export" title="9. Export and sanctions">
        <p>
          You must comply with U.S. and other export-control and sanctions laws.
          You may not use or export {LEGAL.product} if you are prohibited from
          receiving U.S. software, including persons on restricted-party lists or
          in comprehensively embargoed jurisdictions, except as authorized by law.
        </p>
      </LegalSection>

      <LegalSection id="law" title="10. Governing law">
        <p>
          These Terms are governed by the laws of the State of California, United
          States, without regard to conflict-of-law rules. Except where prohibited
          (including certain EU consumer protections that cannot be waived),
          exclusive venue for disputes is the state or federal courts located in
          California, and you consent to personal jurisdiction there.
        </p>
        <p>
          If a provision is unenforceable, the rest remains in effect. These Terms,
          the Privacy Policy, the MIT License, and{" "}
          <code className="font-mono text-[0.9em] text-paper">DISCLAIMER.md</code>{" "}
          are the entire agreement regarding the Services. Failure to enforce a
          provision is not a waiver.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="11. Changes">
        <p>
          We may update these Terms by posting a new version on this page with a
          revised effective date. Continued use after the effective date
          constitutes acceptance. Material changes will be reflected here; we are
          not able to email users of a local-first app we do not account-gate.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="12. Contact">
        <p>
          Legal notices:{" "}
          <a
            href={LEGAL.issues}
            className="text-paper underline decoration-rule underline-offset-4 hover:text-signal"
          >
            GitHub issues
          </a>
          .
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
