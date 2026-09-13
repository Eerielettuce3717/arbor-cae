import { pageMeta } from "@/lib/seo";
import { ROUTES } from "@/lib/site";
import { LegalCallout, LegalDoc, LegalSection } from "@/components/LegalDoc";
import { LEGAL } from "@/lib/legal";

export const metadata = pageMeta({
  title: "Privacy Policy — Arbor website and desktop app",
  description:
    "Arbor does not upload CAD designs. This policy covers GitHub Pages logs, GitHub issues, and California / GDPR rights for the project website.",
  path: ROUTES.privacy,
});

const TOC = [
  { id: "local-first", label: "Local-first advantage" },
  { id: "who", label: "Who we are" },
  { id: "collect", label: "What we collect" },
  { id: "why", label: "Why we collect it" },
  { id: "cookies", label: "Cookies and consent" },
  { id: "retention", label: "How long we keep it" },
  { id: "sharing", label: "Sharing and processors" },
  { id: "gdpr", label: "GDPR rights" },
  { id: "ccpa", label: "CCPA / CPRA rights" },
  { id: "transfers", label: "International transfers" },
  { id: "children", label: "Children" },
  { id: "security", label: "Security" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact and requests" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDoc
      docId="AR-PRIV-001"
      kicker="Privacy · CCPA / GDPR · Rev A"
      title="Privacy Policy"
      lede={`${LEGAL.product} is built so your geometry never needs a cloud. This policy explains the small amount of GitHub Pages log data that may exist, your California and European rights, and how to reach the project.`}
      toc={TOC}
      crumbHref={ROUTES.privacy}
    >
      <LegalSection id="local-first" title="1. The local-first advantage">
        <LegalCallout
          kicker="What we do not collect"
          title="The desktop app does not send your CAD to the cloud."
        >
          <p>
            <strong className="font-medium text-paper">
              {LEGAL.product} does not upload user CAD designs, geometric data,
              feature trees, board layouts, toolpaths, or other proprietary IP to
              our servers.
            </strong>{" "}
            Projects live in local SQLite (including{" "}
            <code className="font-mono text-[0.9em] text-paper">.cad_db</code>{" "}
            files) on your machine. There is no design cloud, no model telemetry,
            and no remote copy of your work unless you choose to send a file
            somewhere yourself.
          </p>
        </LegalCallout>
        <p>
          This policy is therefore mostly about the <em>website</em> (this
          marketing site and GitHub-hosted downloads), not about the contents
          of your part studios.
        </p>
      </LegalSection>

      <LegalSection id="who" title="2. Who we are">
        <p>
          Controller: {LEGAL.operator}, operators of the {LEGAL.product} project
          and this website. Contact:{" "}
          <a
            href={LEGAL.issues}
            className="text-paper underline decoration-rule underline-offset-4 hover:text-signal"
          >
            GitHub issues
          </a>
          . We do not appoint a Data Protection Officer; privacy requests go to
          that repository.
        </p>
      </LegalSection>

      <LegalSection id="collect" title="3. What we collect">
        <p>
          We do <strong className="font-medium text-paper">not</strong> collect
          accounts, billing data, or CAD files through the desktop application.
          On the website and related infrastructure we may process:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-paper">Host access logs</strong>{" "}
            from GitHub Pages and GitHub Releases — IP address, user agent,
            requested path, and time. GitHub operates that infrastructure; we do
            not run a separate analytics product on this site.
          </li>
          <li>
            <strong className="font-medium text-paper">Communications</strong> you
            send us (issues, pull requests, emails), which are also subject to
            GitHub’s or your email provider’s policies.
          </li>
        </ul>
        <p>
          We do not intentionally collect special-category data under GDPR, and
          we do not use the desktop app to profile how you model.
        </p>
      </LegalSection>

      <LegalSection id="why" title="4. Why we collect it">
        <p>Purposes and, for GDPR, typical legal bases:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-paper">Operate the website</strong>{" "}
            — GitHub Pages delivers HTML, CSS, and fonts (legitimate interests).
          </li>
          <li>
            <strong className="font-medium text-paper">Distribute binaries</strong>{" "}
            — GitHub Releases logs who fetched an asset (legitimate interests).
          </li>
          <li>
            <strong className="font-medium text-paper">Comply with law</strong>{" "}
            — respond to rights requests sent through GitHub issues (legal
            obligation).
          </li>
        </ul>
        <p>
          We do not use this data for advertising profiles, and we do not sell
          personal information.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="5. Cookies and consent">
        <p>
          This marketing site is a static GitHub Pages export. It does not set
          a first-party analytics cookie, does not load a consent banner, and
          does not run Google Analytics, Vercel Analytics, or Termly.
        </p>
        <p>
          GitHub may set cookies on github.com when you follow a Source or
          Download link. Those cookies are GitHub’s, not Arbor’s. The desktop
          application stores local project files and optional UI preferences on
          disk; that is not website tracking.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="6. How long we keep it">
        <p>
          GitHub Pages and GitHub Releases retain access logs on GitHub’s
          schedule. We do not operate a separate analytics warehouse. We do not
          retain CAD designs because we never receive them from the app.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="7. Sharing and processors">
        <p>
          We share personal data only with processors who help run the project,
          under their terms:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>GitHub — Pages hosting, source, issues, and release downloads</li>
        </ul>
        <p>
          We may disclose information if required by law, to prevent harm or
          abuse, or in a merger or transfer of the project, with notice where
          required. We do not sell personal information for money.
        </p>
      </LegalSection>

      <LegalSection id="gdpr" title="8. GDPR rights (EEA / UK / Switzerland)">
        <p>
          If GDPR or the UK GDPR applies, you have the right to access, rectify,
          erase (“right to be forgotten”), restrict, or object to processing,
          and to data portability, subject to legal limits. Where processing is
          based on consent, you may withdraw it at any time without affecting
          prior lawful processing. This site does not run a consent banner.
        </p>
        <p>
          You may lodge a complaint with your local supervisory authority (for
          example a EU data-protection authority or the UK ICO). We would rather
          fix the issue directly first.
        </p>
        <p>
          Because the desktop app holds your designs locally, a deletion request
          cannot reach files on your disk — you already control those. Deletion
          applies to data we actually hold (GitHub issue content we can edit).
        </p>
      </LegalSection>

      <LegalSection id="ccpa" title="9. CCPA / CPRA rights (California)">
        <p>If you are a California resident, you have the right to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-paper">Know</strong> the
            categories and specific pieces of personal information we collected,
            sources, purposes, and categories of third parties (this policy is
            that disclosure; you may also request a copy).
          </li>
          <li>
            <strong className="font-medium text-paper">Delete</strong> personal
            information we hold, with statutory exceptions.
          </li>
          <li>
            <strong className="font-medium text-paper">Correct</strong> inaccurate
            personal information.
          </li>
          <li>
            <strong className="font-medium text-paper">Opt out</strong> of sale or
            sharing of personal information, including sharing for cross-context
            behavioral advertising. We do not sell PI for money and we do not run
            advertising or analytics cookies on this site.
          </li>
          <li>
            <strong className="font-medium text-paper">Limit</strong> use of
            sensitive personal information — we do not collect sensitive PI to
            use for inferring characteristics.
          </li>
          <li>
            <strong className="font-medium text-paper">Non-discrimination</strong>{" "}
            for exercising these rights.
          </li>
        </ul>
        <p>
          Categories we may collect: identifiers (IP address in GitHub logs) and
          requested URLs. We do not collect CAD files or government IDs.
        </p>
        <p>
          To submit a request, open a GitHub issue titled “Privacy Request.” We will verify you
          using the contact channel and information reasonably necessary (we have
          no account system). An authorized agent may submit a request with proof
          of authority.
        </p>
        <p>
          We will respond within 45 days, or as otherwise required, and explain
          any delay.
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="10. International transfers">
        <p>
          Our host (GitHub) is in the United States. Access logs for this site
          are processed under GitHub’s terms. U.S. law may allow public-authority
          access in ways that differ from EU law.
        </p>
      </LegalSection>

      <LegalSection id="children" title="11. Children">
        <p>
          The Services are not directed to children under 16, and we do not
          knowingly collect their personal information. If you believe we have,
          contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection id="security" title="12. Security">
        <p>
          We use HTTPS on this site and keep the CAD workload on-device by
          design. No method of transmission or storage is perfectly secure.
          Protect your own machine, backups, and{" "}
          <code className="font-mono text-[0.9em] text-paper">.cad_db</code>{" "}
          files; we cannot
          recover local projects we never received.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes">
        <p>
          We may update this policy by posting a new version with a new
          effective date. Check this page for the current text.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="14. Contact and requests">
        <p>
          Privacy requests (access, deletion, opt-out, do not sell/share):{" "}
          <a
            href={LEGAL.issues}
            className="text-paper underline decoration-rule underline-offset-4 hover:text-signal"
          >
            GitHub issues
          </a>
          . Source and issues:{" "}
          <a href={LEGAL.github} className="text-paper underline decoration-rule underline-offset-4 hover:text-signal">
            {LEGAL.github}
          </a>
          .
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
