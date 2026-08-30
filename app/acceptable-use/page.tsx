export const metadata = {
  title: "Acceptable use",
};

export default function AcceptableUsePage() {
  return (
    <div className="shell content-page">
      <span className="eyebrow">Use responsibly</span>
      <h1>Research should reduce harm, not create it.</h1>
      <p className="lead">
        Before You Trust is intended for legitimate personal due diligence using
        public information.
      </p>

      <div className="prose-card legal-copy">
        <h2>Appropriate examples</h2>
        <p>
          Checking whether an online identity is consistent, verifying public
          claims before entering a personal or business relationship, or
          reviewing a leader’s public professional/organizational footprint
          before granting significant trust.
        </p>

        <h2>Not allowed</h2>
        <p>
          Do not use the service to stalk, harass, threaten, doxx, identify a
          protected victim, target minors, unlawfully discriminate, expose home
          addresses/private contact details, facilitate violence or conduct
          unlawful surveillance.
        </p>

        <h2>Not for regulated screening</h2>
        <p>
          Do not use Before You Trust to make employment, housing, tenancy,
          credit, insurance or other regulated eligibility decisions. The
          service is not designed to satisfy consumer-reporting/background-check
          obligations in those contexts.
        </p>

        <h2>Interpretation matters</h2>
        <p>
          Do not treat allegations, complaints, forum posts or search-result
          snippets as established facts. Open the source, check its date and
          provenance, distinguish accusation from adjudication, and look for
          corrections or later outcomes.
        </p>

        <h2>Report misuse or request privacy action</h2>
        <p>
          Use the Share Your Story form and choose the appropriate topic. The
          form can also route a privacy/data request privately to the operator.
        </p>
      </div>
    </div>
  );
}
