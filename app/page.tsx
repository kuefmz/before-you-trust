import Link from "next/link";

import { SearchExperience } from "@/components/SearchExperience";
import { SupportLink } from "@/components/SupportLink";

const supportUrl = process.env.NEXT_PUBLIC_BUY_ME_A_COFFEE_URL?.trim();

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <span className="eyebrow eyebrow--light">
              Evidence before assumptions
            </span>
            <h1>Know what the internet already knows.</h1>
            <p>
              Before You Trust helps you research a public footprint, confirm
              you have the right person, verify claims, and inspect the original
              sources before making an important decision.
            </p>
            <div className="hero-points" aria-label="Product principles">
              <span>Sources, not mystery scores</span>
              <span>Identity confirmation first</span>
              <span>Privacy-first monitoring</span>
            </div>
          </div>

          <aside className="trust-preview" aria-label="Trust Brief preview">
            <span className="trust-preview__label">Trust Brief preview</span>
            <div>
              <strong>Identity</strong>
              <span>Confirm the correct person</span>
            </div>
            <div>
              <strong>Public footprint</strong>
              <span>Professional, social, news, official</span>
            </div>
            <div>
              <strong>Claims</strong>
              <span>Find sources that corroborate or conflict</span>
            </div>
            <div>
              <strong>Closer review</strong>
              <span>Separate allegations from established facts</span>
            </div>
          </aside>
        </div>
      </section>

      <div className="shell search-shell">
        <SearchExperience />
      </div>

      <section className="principles">
        <div className="shell">
          <div className="section-heading">
            <span className="eyebrow">Different by design</span>
            <h2>No fake warnings. No blind trust score.</h2>
            <p>
              The product is built to make evidence easier to review, not to
              decide whether a human being is “good” or “bad”.
            </p>
          </div>

          <div className="principle-grid">
            <article>
              <span>01</span>
              <h3>See the source</h3>
              <p>
                Every meaningful finding links back to the original public
                source so you can judge it yourself.
              </p>
            </article>
            <article>
              <span>02</span>
              <h3>Confirm identity</h3>
              <p>
                Namesakes are kept separate. Deeper research starts only after
                you confirm the likely person.
              </p>
            </article>
            <article>
              <span>03</span>
              <h3>Respect uncertainty</h3>
              <p>
                “Nothing found” never means safe, and a public allegation never
                becomes a proven fact.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="community-cta">
        <div className="shell community-cta__inner">
          <div>
            <span className="eyebrow eyebrow--light">Built from real lessons</span>
            <h2>Have a story that could help shape this?</h2>
            <p>
              Share what you wish you had known earlier, suggest a source we
              should check, or tell me where the product is missing something.
              Submissions are delivered privately by email.
            </p>
          </div>
          <div className="community-cta__actions">
            <Link className="button button--light" href="/share-your-story">
              Share your story
            </Link>
            {supportUrl ? (
              <SupportLink
                className="button button--outline-light"
                href={supportUrl}
              />
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
