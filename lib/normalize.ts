import type {
  QueryKind,
  SearchResult,
  SourceType,
} from "@/types/search";

const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

const PROFESSIONAL_HOSTS = [
  "linkedin.com",
  "github.com",
  "orcid.org",
  "researchgate.net",
  "scholar.google.com",
];

const SOCIAL_HOSTS = [
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "youtube.com",
  "reddit.com",
];

const NEWS_HOSTS = [
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "bbc.co.uk",
  "theguardian.com",
  "nytimes.com",
  "bloomberg.com",
  "cnn.com",
  "npr.org",
  "ft.com",
];

function matchesHost(hostname: string, domains: string[]): boolean {
  return domains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

export function normalizeUrl(value: string): string {
  try {
    const parsed = new URL(value);
    parsed.hash = "";

    for (const key of [...parsed.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key)) {
        parsed.searchParams.delete(key);
      }
    }

    parsed.searchParams.sort();

    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }

    return parsed.toString();
  } catch {
    return value.trim();
  }
}

export function categorizeSource(value: string): SourceType {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");

    if (
      /(^|\.)gov(\.|$)/.test(host) ||
      host.endsWith(".admin.ch") ||
      host.endsWith(".europa.eu") ||
      host.includes("court") ||
      host.includes("justice") ||
      host.includes("regulator")
    ) {
      return "official";
    }

    if (matchesHost(host, PROFESSIONAL_HOSTS)) return "professional";
    if (matchesHost(host, SOCIAL_HOSTS)) return "social";
    if (matchesHost(host, NEWS_HOSTS)) return "news";

    return "web";
  } catch {
    return "web";
  }
}

export interface ResultContribution {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string | null;
  provider: string;
  query: string;
  queryKind: QueryKind;
}

export function dedupeResults(
  contributions: ResultContribution[],
  limit = 60,
): SearchResult[] {
  const merged = new Map<string, SearchResult>();

  for (const contribution of contributions) {
    const url = normalizeUrl(contribution.url);
    if (!url) continue;

    const existing = merged.get(url);
    if (existing) {
      if (!existing.providers.includes(contribution.provider)) {
        existing.providers.push(contribution.provider);
      }
      if (!existing.queries.includes(contribution.query)) {
        existing.queries.push(contribution.query);
      }
      if (!existing.queryKinds.includes(contribution.queryKind)) {
        existing.queryKinds.push(contribution.queryKind);
      }
      if (
        contribution.snippet.length > existing.snippet.length &&
        contribution.snippet.length <= 1200
      ) {
        existing.snippet = contribution.snippet;
      }
      continue;
    }

    merged.set(url, {
      title: contribution.title.trim().slice(0, 300) || url,
      url,
      snippet: contribution.snippet.trim().slice(0, 1200),
      sourceType: categorizeSource(url),
      publishedAt: contribution.publishedAt ?? null,
      providers: [contribution.provider],
      queries: [contribution.query],
      queryKinds: [contribution.queryKind],
    });
  }

  return [...merged.values()].slice(0, limit);
}

export function mergeSearchResults(
  results: SearchResult[],
  limit = 80,
): SearchResult[] {
  const contributions: ResultContribution[] = results.flatMap((result) => {
    const queries = result.queries.length ? result.queries : ["public source"];
    return queries.map((query, index) => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      publishedAt: result.publishedAt,
      provider: result.providers[0] ?? "unknown",
      query,
      queryKind: result.queryKinds[index] ?? result.queryKinds[0] ?? "general",
    }));
  });
  return dedupeResults(contributions, limit);
}
