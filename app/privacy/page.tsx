export const metadata = {
  title: "Privacy",
};

const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim();

export default function PrivacyPage() {
  return (
    <div className="shell content-page legal-page">
      <span className="eyebrow">Privacy notice</span>
      <h1>Privacy-first by architecture, not by slogan.</h1>
      <p className="lead">
        Last updated: 30 August 2026. This notice explains what Before You Trust
        processes, what it deliberately avoids storing, and how optional
        analytics and repeat-search monitoring work.
      </p>

      <div className="prose-card legal-copy">
        <h2>1. Who operates the service</h2>
        <p>
          Before You Trust is an independent project operated from Switzerland.
          For privacy questions or rights requests,{" "}
          {privacyEmail ? (
            <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>
          ) : (
            <a href="/share-your-story">use the contact form and choose “Privacy / data request”</a>
          )}
          .
        </p>

        <h2>2. Search data</h2>
        <p>
          To perform a search, the server necessarily processes the name and
          optional context you enter and sends relevant search queries to the
          configured public-web search provider. Search results are returned to
          your browser. Before You Trust does not create a persistent database
          containing the raw searched name or your Trust Brief.
        </p>

        <h2>3. Repeat-search signals</h2>
        <p>
          If repeat-search monitoring is enabled, the raw name is normalized in
          memory and converted server-side into a keyed HMAC-SHA256 fingerprint.
          The signal table stores only that fingerprint, a counter, first/last
          timestamps, a data-version marker and an automatic expiry timestamp.
          It does not store the raw name, location, employer, username, profile
          URL, search results or the identity of the visitor.
        </p>
        <p>
          The default retention window is 30 days from the most recent search,
          after which DynamoDB TTL is configured to remove the record. The
          purpose is abuse/anomaly awareness—for example, noticing that the same
          normalized name is being searched unusually often. A repeated search
          is not evidence that the searched person has done anything wrong.
        </p>
        <p>
          Alert emails do not include the raw name by default. The deployment
          supports an explicit administrator setting that can include it, but
          enabling that setting means the name will be stored in the operator’s
          mailbox and transactional-email logs. The recommended configuration
          is to keep it disabled.
        </p>

        <h2>4. Story and contact submissions</h2>
        <p>
          The story form can contain personal data that you voluntarily submit,
          including an optional name or reply email. The application does not
          save the submission in its own database; it sends the content to the
          project operator using the configured transactional email provider.
          The mailbox and email provider therefore retain the message according
          to their own settings and retention rules.
        </p>
        <p>
          Permission to use an anonymized excerpt is separate and optional. A
          story is not publicly licensed merely because you submitted it.
        </p>

        <h2>5. Analytics and cookies</h2>
        <p>
          Google Tag Manager is optional and is not loaded at all unless it is
          configured by the operator. When configured, analytics storage is
          denied by default and no Google tag is loaded until you explicitly
          choose “Allow analytics.” If you reject analytics, the site remains
          fully functional.
        </p>
        <p>
          Search names, free-text claims, story content, source URLs and
          candidate identities are never intentionally sent to GA4. The
          analytics layer is limited to product events such as whether a search
          was started/completed, counts of returned items, story-form
          submission and support-link clicks.
        </p>
        <p>
          Your analytics preference is stored locally in your browser so the
          site can remember the choice. This preference storage is used only
          for consent management.
        </p>

        <h2>6. Technical logs</h2>
        <p>
          Hosting, CDN, security and search/email providers may process
          technical connection data such as IP address, timestamps and user
          agent as part of delivering and securing their services. Application
          code is designed not to log search bodies or story contents. The
          operator should keep infrastructure logging to the minimum required
          for reliability and security.
        </p>

        <h2>7. Purposes and legal bases</h2>
        <p>
          The service is designed around purpose limitation and data
          minimization. Where the GDPR applies, processing necessary to provide
          a requested search may rely on performance of the requested service
          and/or legitimate interests, while optional analytics relies on
          consent. Repeat-search monitoring is intended to rely on the
          legitimate interest in preventing abuse and understanding unusual
          usage, balanced by pseudonymization, short retention and exclusion of
          visitor identifiers. Voluntary story submissions are processed at
          your request and with explicit acknowledgement of the email delivery.
        </p>

        <h2>8. Service providers and international transfers</h2>
        <p>
          Depending on deployment, the service may use AWS Amplify/DynamoDB,
          Tavily and/or Brave Search, Brevo, and—only after analytics
          consent—Google Tag Manager/Google Analytics. Each provider has its own
          processing locations, contractual terms and privacy documentation.
          The operator should maintain appropriate data-processing agreements
          and transfer safeguards where required.
        </p>

        <h2>9. Your rights</h2>
        <p>
          Depending on applicable law, you may have rights to information,
          access, correction, deletion, restriction, objection, portability or
          withdrawal of consent. Because repeat-search records are keyed
          fingerprints rather than names, a deletion request concerning such a
          signal may require you to provide the exact name so the same
          fingerprint can be computed and removed.
        </p>
        <p>
          You may also have the right to complain to the Swiss Federal Data
          Protection and Information Commissioner (FDPIC) or, where applicable,
          an EU/EEA supervisory authority.
        </p>

        <h2>10. Children</h2>
        <p>
          The people-search functionality must not be used to target minors.
          Story/concern submissions are for adults; privacy/data-rights requests
          remain available regardless of age.
        </p>

        <h2>11. Automated decisions</h2>
        <p>
          Before You Trust does not make legally significant automated
          decisions and does not assign a person-level “trustworthiness” or
          “danger” score.
        </p>

        <h2>12. Changes</h2>
        <p>
          This notice will be updated when the data flow, vendors or retention
          practices materially change. Production configuration should always
          match what this page says.
        </p>
      </div>
    </div>
  );
}
