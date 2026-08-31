import type { SearchQuery } from "@/types/search";

function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function queryLabel(query: SearchQuery): string {
  const lower = query.text.toLowerCase();
  const platforms: Array<[string, string]> = [
    ["site:linkedin.com", "LinkedIn"],
    ["site:instagram.com", "Instagram"],
    ["site:facebook.com", "Facebook"],
    ["site:tiktok.com", "TikTok"],
    ["site:x.com", "X"],
    ["site:github.com", "GitHub"],
    ["site:youtube.com", "YouTube"],
    ["site:reddit.com", "Reddit"],
  ];

  for (const [needle, label] of platforms) {
    if (lower.includes(needle)) return label;
  }

  if (query.kind === "official") return "Official / registry";
  if (query.kind === "news") return "News";
  if (query.kind === "concern") return "Closer review";
  if (query.kind === "claim") return "Claim check";
  if (query.kind === "professional") return "Professional";
  if (query.kind === "identity") return "Identity";
  return "Public web";
}

export function ManualSearchPanel({
  queries,
}: {
  queries: SearchQuery[];
}) {
  return (
    <section
      aria-label="Do it yourself on Google"
      className="manual-search-panel"
      id="manual-search-panel"
    >
      <div className="manual-search-panel__heading">
        <div>
          <span className="eyebrow">Optional manual check</span>
          <h3>Run the search yourself on Google</h3>
          <p>
            These are the same focused queries used by the research flow. Each
            button opens a normal Google search in a new tab so you can compare
            results yourself, especially for social profiles that YaCy may not
            have indexed.
          </p>
        </div>
      </div>

      {queries.length > 0 ? (
        <div className="manual-search-list">
          {queries.map((query) => (
            <div className="manual-search-row" key={`${query.kind}:${query.text}`}>
              <div>
                <strong>{queryLabel(query)}</strong>
                <code>{query.text}</code>
              </div>
              <a
                className="button button--ghost button--compact"
                href={googleSearchUrl(query.text)}
                rel="noopener noreferrer"
                target="_blank"
              >
                Search Google ↗
              </a>
            </div>
          ))}
        </div>
      ) : (
        <p className="manual-search-empty">
          Enter a full name first and the manual Google queries will appear
          here.
        </p>
      )}
    </section>
  );
}
