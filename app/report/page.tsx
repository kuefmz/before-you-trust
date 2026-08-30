import Link from "next/link";

export const metadata = {
  title: "Reports are session-only",
  robots: { index: false, follow: false },
};

export default function ReportPage() {
  return (
    <div className="shell content-page">
      <span className="eyebrow">Private by design</span>
      <h1>Trust Briefs are not stored at a public URL.</h1>
      <p className="lead">
        Reports currently live only in the browser session that created them.
        This avoids creating an indexed database of searches about people.
      </p>
      <Link className="button button--primary" href="/">
        Start a new search
      </Link>
    </div>
  );
}
