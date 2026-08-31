import Link from "next/link";

import { SupportLink } from "@/components/SupportLink";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "The Tinder Swindler & Why Before You Trust Exists",
  description:
    "Why Before You Trust exists, using The Tinder Swindler as a familiar example of why exact identity checks, public-source verification, and context matter before trust.",
  path: "/about",
});

const supportUrl =
  process.env.NEXT_PUBLIC_BUY_ME_A_COFFEE_URL?.trim() ||
  "https://buymeacoffee.com/jenifertabitaciuciukiss";

const cases = [
  {
    title: "The Tinder Swindler / Shimon Hayut",
    year: "Netflix documentary, 2022",
    lesson:
      "Netflix identifies the documentary’s subject as Shimon Hayut, also known as Simon Leviev. The story became a widely recognized example of how an impressive online identity, social proof, travel photos, status claims and personal trust can all feel convincing at the same time. The lesson for Before You Trust is not to label strangers as dangerous. It is to verify the exact identity, trace claims back to independent public sources, and keep uncertainty visible.",
    source:
      "https://www.netflix.com/tudum/articles/who-is-tinder-swindler-real-shimon-hayut",
    sourceLabel: "Netflix Tudum",
  },
  {
    title: "Dirty John / John Meehan",
    year: "2014–2017 reporting",
    lesson:
      "The Los Angeles Times documented prior stalking convictions, restraining orders and professional disciplinary history that became painfully relevant only after trust was already established. The lesson is not that a search guarantees safety—it is that identity resolution and scattered public records can matter.",
    source:
      "https://www.latimes.com/local/la-me-dirty-john-two-20171002-story.html",
    sourceLabel: "Los Angeles Times reporting",
  },
  {
    title: "Bernard Madoff",
    year: "2008–2009",
    lesson:
      "Madoff’s stature and industry roles did not make his investment claims true. The SEC charged him in December 2008, and he later pleaded guilty to 11 federal felonies. The case is a reminder to verify registrations, claims and independent evidence instead of relying on prestige.",
    source:
      "https://www.sec.gov/news/press/2008/2008-293.htm",
    sourceLabel: "U.S. SEC",
  },
  {
    title: "NXIVM / Keith Raniere",
    year: "2019–2020",
    lesson:
      "Raniere was convicted of racketeering, sex trafficking and other offenses and sentenced to 120 years in prison. It illustrates why due diligence can matter not only in dating or business, but also before granting authority to leaders and organizations.",
    source:
      "https://www.justice.gov/usao-edny/pr/nxivm-leader-keith-raniere-sentenced-120-years-prison-racketeering-and-sex-trafficking",
    sourceLabel: "U.S. Department of Justice",
  },
  {
    title: "Theranos / Elizabeth Holmes",
    year: "2022",
    lesson:
      "A federal jury convicted Holmes on investor-fraud counts after years of extraordinary claims around Theranos. The lesson for this project is simple: claims should be checked against independent reporting, regulators, professional records and primary sources.",
    source:
      "https://www.justice.gov/usao-ndca/us-v-elizabeth-holmes-et-al",
    sourceLabel: "U.S. Department of Justice",
  },
  {
    title: "Fyre Festival / Billy McFarland",
    year: "2018",
    lesson:
      "McFarland pleaded guilty to fraud schemes involving Fyre investors, ticketing and later customers, and was sentenced to six years. It is an example of why business history, prior ventures and independently verifiable claims deserve scrutiny before money or reputation is put at risk.",
    source:
      "https://www.justice.gov/usao-sdny/pr/william-mcfarland-sentenced-6-years-prison-manhattan-federal-court-engaging-multiple",
    sourceLabel: "U.S. Department of Justice",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="about-hero">
        <div className="shell about-hero__grid">
          <div>
            <span className="eyebrow eyebrow--light">Why I built this</span>
            <h1>Trust is human. Verification should be easier.</h1>
          </div>
          <div className="about-founder-card">
            <span>Founder perspective</span>
            <p>
              I am a Switzerland-based software, data and AI engineer and
              product builder. Much of my work is about turning scattered,
              messy information into something structured enough to make a
              better decision.
            </p>
          </div>
        </div>
      </section>

      <div className="shell about-content">
        <section className="about-story">
          <div>
            <span className="eyebrow">The motivation</span>
            <h2>What The Tinder Swindler teaches about online trust.</h2>
          </div>
          <div className="long-copy">
            <p>
              Again and again, the devastating discovery came after the trust:
              a partner had a history nobody had checked, a charismatic leader
              had a trail of disputes or reporting, a founder&apos;s claims did
              not withstand independent scrutiny, or multiple public clues
              existed in places ordinary people would never know to search.
            </p>
            <p>
              One of the most recognizable recent examples is{" "}
              <strong>The Tinder Swindler</strong>. Netflix&apos;s documentary
              follows Shimon Hayut, also known as Simon Leviev, and shows how an
              apparently credible online identity can be reinforced by social
              media, status signals and repeated personal claims. The useful
              lesson is not “trust nobody.” It is that identity and claims can
              sometimes be checked against independent public evidence before a
              relationship, investment or commitment becomes costly.
            </p>
            <p>
              That does not mean every tragedy was preventable, and it would be
              irresponsible to promise that a web search can tell you whether a
              person is “safe.” It cannot. But sometimes relevant information
              is already public. The failure is discoverability: knowing what
              to search, separating namesakes, understanding source quality and
              seeing conflicting claims in one place.
            </p>
            <p>
              Before You Trust is my attempt to make that research process
              accessible without turning it into surveillance or a creepy
              people-scoring product. It should show evidence, preserve
              uncertainty and let the user make the decision.
            </p>
          </div>
        </section>

        <section className="case-section">
          <div className="section-heading">
            <span className="eyebrow">Cases that shaped the idea</span>
            <h2>Familiar stories. The same need for independent checks.</h2>
            <p>
              These cases are included because they are well documented and
              illustrate different forms of misplaced trust. They do not imply
              that Before You Trust would certainly have prevented the harm,
              and a public source must always be read in context.
            </p>
          </div>

          <div className="case-grid">
            {cases.map((item) => (
              <article className="case-card" key={item.title}>
                <span>{item.year}</span>
                <h3>{item.title}</h3>
                <p>{item.lesson}</p>
                <a
                  href={item.source}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {item.sourceLabel} ↗
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="about-principles">
          <div>
            <span className="eyebrow">What this project will not become</span>
            <h2>Evidence over judgement.</h2>
          </div>
          <div className="principle-list">
            <p>
              <strong>No “good person / bad person” score.</strong> Human beings
              are not reducible to a risk number.
            </p>
            <p>
              <strong>No hidden-source accusations.</strong> Material findings
              should remain traceable to public sources.
            </p>
            <p>
              <strong>No assumption that silence means safety.</strong> A sparse
              internet footprint is just a sparse internet footprint.
            </p>
            <p>
              <strong>No raw-name analytics or search-history database.</strong>{" "}
              Ordinary searches are processed transiently and searched names are
              not intentionally sent to analytics.
            </p>
          </div>
        </section>

        <section className="about-cta">
          <div>
            <h2>Verify the source, then decide.</h2>
            <p>
              Try the public-web research flow, or share a story about where
              earlier information would have changed what you did.
            </p>
          </div>
          <div className="community-cta__actions">
            <Link className="button button--primary" href="/">
              Start a search
            </Link>
            <Link className="button button--ghost" href="/share-your-story">
              Share your story
            </Link>
            {supportUrl ? <SupportLink href={supportUrl} /> : null}
          </div>
        </section>
      </div>
    </>
  );
}
