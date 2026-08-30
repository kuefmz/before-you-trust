export const metadata = {
  title: "Acceptable use",
};

export default function AcceptableUsePage() {
  return (
    <div className="shell content-page">
      <span className="eyebrow">Use responsibly</span>
      <h1>Research should reduce harm, not create it.</h1>
      <p className="lead">
        Before You Trust is intended for legitimate due diligence using public
        information.
      </p>

      <div className="prose-card">
        <h2>Allowed examples</h2>
        <p>
          Verifying the public identity or claims of someone you are considering
          dating, hiring, working with, investing with, renting from, joining,
          or otherwise placing meaningful trust in.
        </p>

        <h2>Not allowed</h2>
        <p>
          Do not use the service to stalk, harass, threaten, doxx, discriminate,
          target minors, expose private contact information, evade platform
          safeguards, or facilitate unlawful surveillance.
        </p>

        <h2>Interpretation matters</h2>
        <p>
          Do not treat allegations, complaints, forum posts, or search-result
          snippets as established facts. Open the source, check its date and
          provenance, and distinguish accusations from adjudicated outcomes.
        </p>

        <h2>Production launch</h2>
        <p>
          Before meaningful public scale, jurisdiction-specific legal review is
          required for privacy, defamation, consumer-protection, and
          public-record obligations.
        </p>
      </div>
    </div>
  );
}
