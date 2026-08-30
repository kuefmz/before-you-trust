import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell content-page">
      <span className="eyebrow">404</span>
      <h1>That page does not exist.</h1>
      <p className="lead">
        Nothing about a searched person is stored at a permanent report URL.
      </p>
      <Link className="button button--primary" href="/">
        Back home
      </Link>
    </div>
  );
}
