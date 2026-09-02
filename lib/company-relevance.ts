import type { SearchInput, SearchResult } from "@/types/search";

const COMMON_HOST_LABELS = new Set([
  "www",
  "shop",
  "store",
  "app",
  "web",
  "online",
  "co",
  "com",
  "org",
  "net",
  "io",
  "ai",
  "ch",
  "de",
  "fr",
  "it",
  "uk",
]);

function normalize(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value: string): string {
  return normalize(value).replace(/\s+/g, "");
}

function hostname(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).hostname.toLocaleLowerCase().replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function stripDomainSuffix(value: string): string {
  const normalized = normalize(value);
  const parts = normalized.split(" ").filter(Boolean);

  if (parts.length > 1 && COMMON_HOST_LABELS.has(parts.at(-1)!)) {
    return parts.slice(0, -1).join(" ");
  }

  return normalized;
}

function domainBrandTokens(host?: string): string[] {
  if (!host) return [];

  return host
    .split(".")
    .map((part) => normalize(part))
    .filter(
      (part) =>
        part.length >= 4 &&
        !COMMON_HOST_LABELS.has(part),
    );
}

function containsPhrase(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return ` ${normalize(haystack)} `.includes(` ${normalize(needle)} `);
}

function resultHostname(result: SearchResult): string | undefined {
  return hostname(result.url);
}

function sameOrSubdomain(candidate: string | undefined, target: string): boolean {
  if (!candidate) return false;
  return candidate === target || candidate.endsWith(`.${target}`);
}

function relevanceScore(result: SearchResult, input: SearchInput): number {
  const targetHost = hostname(input.profileUrl);
  const resultHost = resultHostname(result);
  const title = result.title;
  const snippet = result.snippet;
  const url = result.url.toLocaleLowerCase();

  let score = 0;

  if (targetHost && sameOrSubdomain(resultHost, targetHost)) {
    score += 140;
  }

  if (targetHost) {
    if (title.toLocaleLowerCase().includes(targetHost)) score += 100;
    if (snippet.toLocaleLowerCase().includes(targetHost)) score += 90;
    if (url.includes(targetHost)) score += 80;
  }

  const companyPhrase = stripDomainSuffix(input.name);
  const companyWords = companyPhrase.split(" ").filter(Boolean);
  const companyCompact = compact(companyPhrase);

  if (companyPhrase.length >= 4) {
    if (containsPhrase(title, companyPhrase)) score += 80;
    if (containsPhrase(snippet, companyPhrase)) score += 55;
  }

  if (companyCompact.length >= 6) {
    const titleCompact = compact(title);
    const snippetCompact = compact(snippet);
    const urlCompact = compact(url);

    if (titleCompact.includes(companyCompact)) score += 65;
    if (snippetCompact.includes(companyCompact)) score += 45;
    if (urlCompact.includes(companyCompact)) score += 55;
  }

  for (const brand of domainBrandTokens(targetHost)) {
    if (brand.length < 6) continue;

    if (compact(title).includes(brand)) score += 55;
    if (compact(snippet).includes(brand)) score += 35;
    if (compact(url).includes(brand)) score += 45;
  }

  // For short or generic one-word business names, require stronger website
  // evidence rather than accepting unrelated pages that happen to contain the
  // same common word.
  if (
    companyWords.length === 1 &&
    companyWords[0]!.length < 7 &&
    score < 80
  ) {
    return 0;
  }

  return score;
}

export function rankCompanyResults(
  results: SearchResult[],
  input: SearchInput,
): SearchResult[] {
  return results
    .map((result) => ({ result, score: relevanceScore(result, input) }))
    .filter(({ score }) => score >= 35)
    .sort((a, b) => b.score - a.score)
    .map(({ result }) => result);
}
