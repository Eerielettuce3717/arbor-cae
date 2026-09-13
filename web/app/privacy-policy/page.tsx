import type { Metadata } from "next";
import { LegalCallout, LegalDoc, LegalSection } from "@/components/LegalDoc";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — Arbor",
  description:
    "How Arbor handles website analytics, cookies, and CCPA/GDPR rights — and why the desktop CAD app does not upload your designs.",
};

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
      lede={`${LEGAL.product} is built so your geometry never needs a cloud. This policy explains the small amount of website and diagnostic data we may process, your California and European rights, and how to opt out.`}
      toc={TOC}
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
          marketing site, downloads, and consent tooling), not about the contents
          of your part studios.
        </p>
      </LegalSection>

      <LegalSection id="who" title="2. Who we are">
        <p>
          Controller: {LEGAL.operator}, operators of the {LEGAL.product} project
          and this website. Contact:{" "}
          <a
            href={`mailto:${LEGAL.privacyEmail}`}
            className="text-paper underline decoration-rule underline-offset-4 hover:text-signal"
          >
            {LEGAL.privacyEmail}
          </a>{" "}
          or{" "}
          <a href={LEGAL.issues} className="text-paper underline decoration-rule underline-offset-4 hover:text-signal">
            GitHub issues
          </a>
          .
        </p>
        <p>
          Replace the placeholder email with a monitored inbox before production.
          We do not appoint a Data Protection Officer; privacy requests go to the
          contact above.
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
            <strong className="font-medium text-paper">Website analytics</strong>{" "}
            from Google Analytics and/or Vercel Analytics — for example pages
            viewed, referrer, approximate location derived from IP, browser and
            device type, and aggregated traffic. This runs only after consent
            where required (see Cookies).
          </li>
          <li>
            <strong className="font-medium text-paper">IP address</strong> for
            security, abuse prevention, and download regionality (serving or
            measuring which region a release was fetched from). GitHub, Vercel,
            or a CDN may log the same when you hit a release asset.
          </li>
          <li>
            <strong className="font-medium text-paper">Minimal crash logs</strong>{" "}
            if diagnostic reporting is enabled — operating-system version, app
            version, and error codes or stack frames. Crash logs are not supposed
            to include part geometry or design IP. If a log accidentally contains
            a file path you consider sensitive, request deletion.
          </li>
          <li>
            <strong className="font-medium text-paper">Consent records</strong>{" "}
            from Termly (your cookie choices, timestamp, and a consent proof).
          </li>
          <li>
            <strong className="font-medium text-paper">Communications</strong> you
            send us (issues, emails, pull requests), which are subject to
            GitHub’s or your email provider’s policies as well as ours.
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
            — deliver pages, assets, and downloads (legitimate interests /
            contract).
          </li>
          <li>
            <strong className="font-medium text-paper">Understand traffic and improve stability</strong>{" "}
            — analytics and crash metadata so we can see which platforms fail and
            whether the site works (consent where required; otherwise legitimate
            interests in a strictly necessary subset).
          </li>
          <li>
            <strong className="font-medium text-paper">Security and regionality</strong>{" "}
            — IP-derived signals to rate-limit abuse and understand download
            geography (legitimate interests).
          </li>
          <li>
            <strong className="font-medium text-paper">Comply with law</strong>{" "}
            — keep consent records and respond to rights requests (legal
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
          This site uses Termly as its consent management platform. Non-essential
          cookies and similar technologies (including analytics) are blocked until
          you accept them, where auto-block is enabled.
        </p>
        <p>
          You can reopen the banner at any time via{" "}
          <button
            type="button"
            className="termly-display-preferences text-paper underline decoration-rule underline-offset-4 hover:text-signal"
          >
            Cookie Preferences
          </button>
          . In the EEA/UK we rely on consent for non-essential cookies. In
          California, that control is also how you opt out of “sharing” for
          cross-context analytics, to the extent those laws apply.
        </p>
        <p>
          Strictly necessary cookies may be set to remember your choice and keep
          the site working. Termly, Vercel, and Google publish their own notices
          for their processing.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="6. How long we keep it">
        <p>
          Analytics events are kept on a standard product cycle of{" "}
          <strong className="font-medium text-paper">14–26 months</strong>, then
          deleted or aggregated, unless a shorter period is configured in Google
          Analytics / Vercel. Consent records are kept as long as needed to show
          we asked. Crash logs are kept only as long as useful to fix a defect
          (typically under 12 months). Server access logs follow our host’s
          default (often 30 days or less, plus backups).
        </p>
        <p>
          We do not retain CAD designs because we never receive them from the
          app.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="7. Sharing and processors">
        <p>
          We share personal data only with processors who help run the project,
          under their terms:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Vercel — website hosting and optional web analytics</li>
          <li>Google — Google Analytics, if enabled after consent</li>
          <li>Termly — cookie consent and preference storage</li>
          <li>GitHub — source hosting, issues, and release downloads</li>
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
          prior lawful processing — use Cookie Preferences or contact us.
        </p>
        <p>
          You may lodge a complaint with your local supervisory authority (for
          example a EU data-protection authority or the UK ICO). We would rather
          fix the issue directly first.
        </p>
        <p>
          Because the desktop app holds your designs locally, a deletion request
          cannot reach files on your disk — you already control those. Deletion
          applies to data we actually hold (analytics identifiers, emails, issue
          content we can edit, consent logs).
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
            behavioral advertising. We do not sell PI for money. Analytics cookies
            may be “sharing” under CPRA — opt out via Cookie Preferences or a
            Global Privacy Control (GPC) signal where Termly honors it.
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
          Categories we may collect: identifiers (IP address, cookie IDs),
          internet activity (page views), and coarse geolocation derived from IP.
          We do not collect CAD files or government IDs.
        </p>
        <p>
          To submit a request, email{" "}
          <a
            href={`mailto:${LEGAL.privacyEmail}`}
            className="text-paper underline decoration-rule underline-offset-4 hover:text-signal"
          >
            {LEGAL.privacyEmail}
          </a>{" "}
          or open a GitHub issue titled “Privacy Request.” We will verify you
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
          Our processors are often in the United States. If we transfer personal
          data from the EEA/UK, we rely on appropriate safeguards such as Standard
          Contractual Clauses implemented by those vendors, plus your consent for
          optional analytics cookies. U.S. law may allow public-authority access
          in ways that differ from EU law.
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
          Protect your own machine, backups, and `.cad_db` files; we cannot
          recover local projects we never received.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes">
        <p>
          We may update this policy by posting a new version with a new
          effective date. Material changes to website tracking will also be
          reflected in Termly’s cookie inventory when you next review
          preferences.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="14. Contact and requests">
        <p>
          Privacy requests (access, deletion, opt-out, do not sell/share):{" "}
          <a
            href={`mailto:${LEGAL.privacyEmail}`}
            className="text-paper underline decoration-rule underline-offset-4 hover:text-signal"
          >
            {LEGAL.privacyEmail}
          </a>
          . Cookie choices:{" "}
          <button
            type="button"
            className="termly-display-preferences text-paper underline decoration-rule underline-offset-4 hover:text-signal"
          >
            Cookie Preferences
          </button>
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
