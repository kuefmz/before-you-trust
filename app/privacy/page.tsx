export const metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <div className="shell content-page">
      <span className="eyebrow">Privacy</span>
      <h1>Searches are ephemeral by default.</h1>
      <p className="lead">
        The MVP is intentionally designed without user accounts or a database
        of searched people.
      </p>

      <div className="prose-card">
        <h2>What Before You Trust stores</h2>
        <p>
          The application does not intentionally persist the name, context, or
          Trust Brief you search for in its own database. Report state stays in
          the active browser session.
        </p>

        <h2>Search providers</h2>
        <p>
          Search requests are sent server-side to the configured third-party
          web-search provider. Those providers have their own processing and
          retention policies. Before public launch, the production privacy
          notice must name the provider actually configured.
        </p>

        <h2>Logs and analytics</h2>
        <p>
          Search payloads must not be placed in product analytics. Production
          logging should be configured to avoid request-body logging and to
          minimize retention of network identifiers.
        </p>

        <h2>No safety guarantee</h2>
        <p>
          Public search coverage is incomplete by nature. A lack of results
          cannot establish that a person is safe, trustworthy, licensed, or
          free of past problems.
        </p>
      </div>
    </div>
  );
}
