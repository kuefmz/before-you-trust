import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Notice",
  description: "How Before You Trust processes public-web searches, analytics consent, optional photos, report email delivery, and privacy requests.",
  path: "/privacy",
  index: true,
});

const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim();

export default function PrivacyPage() {
  return (
    <div className="shell content-page legal-page">
      <span className="eyebrow">Privacy notice</span>
      <h1>Privacy-first by architecture, not by slogan.</h1>
      <p className="lead">
        Last updated: 31 August 2026. This notice explains what Before You Trust
        processes, what it deliberately avoids storing, and when a report is
        intentionally saved for email delivery.
      </p>

      <div className="prose-card legal-copy">
        <h2>1. Who operates the service</h2>
        <p>
          Before You Trust is an independent project operated from Switzerland.
          For privacy questions or rights requests,{" "}
          {privacyEmail ? (
            <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>
          ) : (
            <a href="/share-your-story">
              use the contact form and choose “Privacy / data request”
            </a>
          )}
          .
        </p>

        <h2>2. Search data</h2>
        <p>
          To perform a search, the server necessarily processes the name and
          optional context you enter and sends relevant search queries to the
          configured self-hosted search stack. SearXNG may forward the search
          query to enabled upstream search engines to discover public results.
          YaCy may also be queried as an independent index/fallback; in global
          mode it can ask peers in the YaCy network for results. Search results
          are returned to your browser.
        </p>
        <p>
          The application does not persist ordinary search requests, candidate
          lists, rejected results, or Trust Briefs merely because a search was
          performed. API responses are configured as no-store and searched names
          are not intentionally sent to analytics.
        </p>

        <h2>3. Report storage and email delivery</h2>
        <p>
          If you explicitly request the Trust Brief by email, the report request
          becomes persistent. Before You Trust sends the delivery email, searched
          name and context, selected identity, search-query metadata, final
          filtered report, and included source URLs to the project&apos;s private
          Google Sheet through Google Apps Script.
        </p>
        <p>
          The Google Sheet is the application&apos;s intended persistent datastore
          for report requests. Low-confidence results that were excluded from the
          final report are not intentionally stored there. The uploaded photo is
          not stored there.
        </p>
        <p>
          Google Apps Script sends the report to the address you provide and a
          copy to the project operator. As a consequence, the report and email
          address also exist in the relevant Google/Gmail systems and in the
          recipient&apos;s mailbox. Requesting report delivery is not permission to
          add the address to marketing communications.
        </p>

        <h2>4. Optional photo search</h2>
        <p>
          If you upload a photo, Before You Trust sends it transiently to Google
          Cloud Vision Web Detection to look for public webpages and web images
          that match or resemble it. The application does not save the uploaded
          photo in its own database, Google Sheet, or object storage.
        </p>
        <p>
          Photo matching is a discovery aid, not proof that two images show the
          same person. Users must confirm identity using the surrounding source
          context.
        </p>

        <h2>5. Story and contact submissions</h2>
        <p>
          The story form can contain personal data that you voluntarily submit,
          including an optional name or reply email. That form is handled
          separately from the people-search/report datastore and may use a
          configured transactional email provider to deliver the submission to
          the project operator. The relevant mailbox/provider then retains the
          message according to its own settings and retention rules.
        </p>
        <p>
          Permission to use an anonymized excerpt is separate and optional. A
          story is not publicly licensed merely because you submitted it.
        </p>

        <h2>6. Analytics and cookies</h2>
        <p>
          Google Analytics 4 is configured for the site, and Google Tag Manager
          may also be configured by the operator. Analytics storage is denied
          by default and no Google analytics tag is loaded until you explicitly
          choose “Allow analytics.” If you reject analytics, the site remains
          fully functional.
        </p>
        <p>
          Search names, free-text claims, story content, source URLs, candidate
          identities and delivery email addresses are never intentionally sent
          to GA4. The analytics layer is limited to coarse product events and
          counts.
        </p>
        <p>
          Your analytics preference is stored locally in your browser so the
          site can remember the choice. This preference storage is used only for
          consent management.
        </p>

        <h2>7. Technical logs</h2>
        <p>
          Hosting, CDN, security and external providers may process technical
          connection data such as IP address, timestamps and user agent as part
          of delivering and securing their services. Application code is
          designed not to log search bodies, report bodies or story contents.
          Infrastructure logging should be kept to the minimum required for
          reliability and security.
        </p>

        <h2>8. Purposes and legal bases</h2>
        <p>
          The service is designed around purpose limitation and data
          minimization. Where the GDPR applies, processing necessary to provide a
          requested search may rely on performance of the requested service
          and/or legitimate interests. Saving and emailing a report occurs only
          after the user explicitly requests delivery and acknowledges the
          related processing. Optional analytics relies on consent.
        </p>

        <h2>9. Service providers and international transfers</h2>
        <p>
          Depending on deployment, the service may use AWS Amplify, a
          self-hosted SearXNG metasearch node and its enabled upstream search
          engines, a self-hosted YaCy node (and YaCy peers when global mode is
          enabled), Google Sheets/Apps Script/Gmail for requested report
          storage and delivery, Google Cloud Vision for optional photo web
          matching, Brevo for the separate story/contact flow, and—only after
          analytics consent—Google Tag Manager/Google Analytics. Each external
          service or peer network has its own processing context, locations,
          contractual terms and privacy characteristics.
        </p>

        <h2>10. Your rights</h2>
        <p>
          Depending on applicable law, you may have rights to information,
          access, correction, deletion, restriction, objection, portability or
          withdrawal of consent. For a stored report request, the operator can
          locate the relevant Google Sheet row using information such as the
          request email, searched name, or request identifier and remove it when
          a valid deletion request applies. Email copies may need to be deleted
          separately from the relevant mailboxes.
        </p>
        <p>
          You may also have the right to complain to the Swiss Federal Data
          Protection and Information Commissioner (FDPIC) or, where applicable,
          an EU/EEA supervisory authority.
        </p>

        <h2>11. Children</h2>
        <p>
          The people-search functionality must not be used to target minors.
          Story/concern submissions are for adults; privacy/data-rights requests
          remain available regardless of age.
        </p>

        <h2>12. Automated decisions</h2>
        <p>
          Before You Trust does not make legally significant automated
          decisions and does not assign a person-level “trustworthiness” or
          “danger” score.
        </p>

        <h2>13. Changes</h2>
        <p>
          This notice will be updated when the data flow, vendors or retention
          practices materially change. Production configuration should always
          match what this page says.
        </p>
      </div>
    </div>
  );
}
