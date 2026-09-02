import Link from "next/link";

import { CompanySearchExperience } from "@/components/CompanySearchExperience";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Check a Company or Online Shop Before You Buy",
  description:
    "Research a company or online shop using public sources, reviews, registry leads, news and complaint signals before sending money.",
  path: "/check-company",
});

export default function CheckCompanyPage() {
  return (
    <>
      <section className="company-hero">
        <div className="shell company-hero__grid">
          <div>
            <span className="eyebrow eyebrow--light">Before you buy</span>
            <h1>Check the company behind the website.</h1>
            <p>
              An unfamiliar shop can look polished and still be difficult to
              verify. Search its public footprint, registry leads, reviews,
              news and complaints before you send money.
            </p>
            <div className="company-hero__actions">
              <a className="button button--primary" href="#company-search">
                Check a company →
              </a>
              <Link className="button button--outline-light" href="/">
                Check a person instead
              </Link>
            </div>
          </div>

          <aside className="company-preview" aria-label="Company check preview">
            <span className="trust-preview__label">Company Trust Brief</span>
            <div>
              <strong>Business identity</strong>
              <span>Company name, domain and public presence</span>
            </div>
            <div>
              <strong>Official sources</strong>
              <span>Registry and regulator-oriented results</span>
            </div>
            <div>
              <strong>Independent footprint</strong>
              <span>Reviews, news and other public mentions</span>
            </div>
            <div>
              <strong>Warning signals</strong>
              <span>Complaints, scam reports, fraud and refund concerns</span>
            </div>
          </aside>
        </div>
      </section>

      <div className="shell company-search-shell">
        <CompanySearchExperience />
      </div>

      <section className="company-guidance">
        <div className="shell company-guidance__grid">
          <article>
            <span>01</span>
            <h2>Check the exact domain</h2>
            <p>
              Similar names can belong to different businesses. The website
              address is one of the strongest clues for separating them.
            </p>
          </article>
          <article>
            <span>02</span>
            <h2>Open the original source</h2>
            <p>
              Reviews and complaints can be wrong, manipulated or about another
              business. Read the underlying page before drawing conclusions.
            </p>
          </article>
          <article>
            <span>03</span>
            <h2>No automatic scam verdict</h2>
            <p>
              Before You Trust organizes public evidence. It does not certify a
              seller as safe or label a company as fraudulent.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
