import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How Before You Trust Works",
  description: "How Before You Trust searches public web sources, confirms an exact identity, separates namesakes, and builds a source-linked Trust Brief without a person-level score.",
  path: "/how-it-works",
  index: true,
});

export default function HowItWorksPage() {
  return (
    <div className="shell content-page">
      <span className="eyebrow">How it works</span>
      <h1>Public-web research with identity checks built in.</h1>
      <p className="lead">
        Before You Trust is not a private-record broker and does not promise a
        complete background check. It organizes public search results so they
        are easier to verify.
      </p>

      <div className="step-list">
        <section>
          <span>1</span>
          <div>
            <h2>Start with what you know</h2>
            <p>
              Enter a name and optional context such as city, employer,
              username, or a known public profile.
            </p>
          </div>
        </section>
        <section>
          <span>2</span>
          <div>
            <h2>Confirm the identity</h2>
            <p>
              We surface likely matches and the signals supporting each one.
              You choose the correct person before deeper searches begin.
            </p>
          </div>
        </section>
        <section>
          <span>3</span>
          <div>
            <h2>Build a sourced Trust Brief</h2>
            <p>
              Searches expand to professional, official, news, claim-specific,
              and concern-oriented queries. Results remain linked to their
              original sources.
            </p>
          </div>
        </section>
        <section>
          <span>4</span>
          <div>
            <h2>You decide what it means</h2>
            <p>
              The system avoids a person-level trust or danger score. Source
              quality, context, uncertainty, and the distinction between an
              allegation and an established fact remain visible.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
