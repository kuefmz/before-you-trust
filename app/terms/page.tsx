import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Terms of Use",
  description: "Terms for using Before You Trust as a public-web research assistant, including accuracy limits, prohibited uses, third-party sources and regulated-screening restrictions.",
  path: "/terms",
  index: true,
});

export default function TermsPage() {
  return (
    <div className="shell content-page legal-page">
      <span className="eyebrow">Terms of use</span>
      <h1>Use evidence responsibly.</h1>
      <p className="lead">
        Last updated: 31 August 2026. These terms apply to the public beta of
        Before You Trust and do not limit mandatory rights that apply under
        applicable law.
      </p>

      <div className="prose-card legal-copy">
        <h2>1. What the service is</h2>
        <p>
          Before You Trust is a public-web research assistant. It helps find,
          organize and link to publicly accessible sources. It is not a private
          investigator, consumer reporting agency, law-enforcement database,
          credit bureau, professional background-check service or guarantee of
          safety.
        </p>

        <h2>2. No guarantee of completeness or accuracy</h2>
        <p>
          Search engines can miss records, return stale pages, confuse people
          with similar names or surface inaccurate claims. You must inspect the
          original sources and consider context before acting on any result.
          “No information found” does not mean a person is safe, trustworthy or
          free of past problems.
        </p>

        <h2>3. Allegations are not facts</h2>
        <p>
          A complaint, allegation, arrest, charge, lawsuit, forum post or news
          report is not the same thing as a conviction, judgment or established
          fact. You agree not to misrepresent the status of a source or use a
          search-result snippet as proof of wrongdoing.
        </p>

        <h2>4. Prohibited and regulated uses</h2>
        <p>
          You may not use the service to stalk, harass, threaten, doxx, locate a
          victim, target a minor, discriminate unlawfully, facilitate violence,
          evade platform safeguards, bypass access controls, expose private
          credentials, scrape non-public account areas or conduct unlawful
          surveillance.
        </p>
        <p>
          You must not use Before You Trust as a consumer report or as the basis
          for regulated eligibility decisions involving employment, housing,
          tenancy, credit, insurance or similar decisions where specialized
          screening laws apply.
        </p>

        <h2>5. Public sources and third-party websites</h2>
        <p>
          The service links to third-party websites. Those sites control their
          own content, availability and privacy practices. A link does not mean
          Before You Trust endorses the claim or the publisher.
        </p>

        <h2>6. Photo search and report delivery</h2>
        <p>
          An uploaded photo may be sent transiently to a third-party image
          matching provider to locate public web pages associated with that
          image. A visual match is only a lead and must not be treated as
          proof of identity.
        </p>
        <p>
          If you request a report by email, you authorize use of the delivery
          address for transactional delivery and delivery/support monitoring.
          The address is not permission for marketing without separate consent.
        </p>

        <h2>7. Your submissions</h2>
        <p>
          You remain responsible for material you submit through the story form.
          Do not submit material you have no right to share, unnecessary
          sensitive information, private credentials or unlawful content.
        </p>
        <p>
          Story submissions are private by default. Only when you separately
          opt in to anonymized publication do you grant the operator a
          non-exclusive, worldwide, royalty-free permission to quote or adapt
          an anonymized excerpt for awareness, research about the product or
          project communications. You can withdraw that permission for future
          use by contacting the operator.
        </p>

        <h2>8. Donations</h2>
        <p>
          A “Buy me a coffee” contribution is voluntary support for the project,
          not a purchase of a search result, guarantee, subscription, ownership
          interest or promise of a specific feature. Payments are handled by
          the external donation platform under its own terms.
        </p>

        <h2>9. Availability</h2>
        <p>
          The service may change, suspend providers, impose rate limits or
          remove features for security, cost, legal or reliability reasons.
        </p>

        <h2>10. Limitation of responsibility</h2>
        <p>
          To the maximum extent permitted by applicable law, the service is
          provided without warranties of completeness, fitness for a particular
          decision or uninterrupted availability. Mandatory rights that cannot
          legally be excluded remain unaffected.
        </p>

        <h2>11. Law and disputes</h2>
        <p>
          Swiss law is intended to govern these terms where legally permissible,
          subject to mandatory consumer and data-protection rules that apply to
          you. No clause overrides a mandatory jurisdiction or statutory right.
        </p>

        <h2>12. Changes</h2>
        <p>
          These terms may be updated as the MVP changes. Material changes should
          be reflected here before the corresponding feature is enabled in
          production.
        </p>
      </div>
    </div>
  );
}
