import type {
  IdentityCandidate,
  SearchInput,
  SearchResult,
} from "@/types/search";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "profile",
  "official",
  "page",
]);

function normalize(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}@._ -]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value?: string): string[] {
  if (!value) return [];
  return normalize(value)
    .split(" ")
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function haystack(result: SearchResult): string {
  return normalize(`${result.title} ${result.snippet} ${result.url}`);
}

function scoreResult(
  result: SearchResult,
  input: Pick<
    SearchInput,
    "name" | "location" | "company" | "username" | "profileUrl"
  >,
): { score: number; signals: string[]; conflicts: string[] } {
  const text = haystack(result);
  const title = normalize(result.title);
  const name = normalize(input.name);
  const nameWords = words(input.name);
  let score = 0;
  const signals: string[] = [];
  const conflicts: string[] = [];

  if (title.includes(name)) {
    score += 5;
    signals.push("Full name appears in the result title");
  } else {
    const matches = nameWords.filter((word) => text.includes(word)).length;
    if (matches === nameWords.length && matches > 0) {
      score += 3;
      signals.push("Name terms appear in the result");
    }
  }

  if (input.location) {
    const locationWords = words(input.location);
    const matched = locationWords.filter((word) => text.includes(word));
    if (matched.length > 0) {
      score += 2;
      signals.push("Location context matches");
    }
  }

  if (input.company) {
    const companyWords = words(input.company);
    const matched = companyWords.filter((word) => text.includes(word));
    if (matched.length > 0) {
      score += 3;
      signals.push("Employer or organization context matches");
    }
  }

  if (input.username && text.includes(normalize(input.username))) {
    score += 4;
    signals.push("Username matches");
  }

  if (input.profileUrl) {
    try {
      const expected = new URL(input.profileUrl);
      const actual = new URL(result.url);
      if (
        expected.hostname === actual.hostname &&
        actual.pathname.includes(expected.pathname.replace(/\/+$/, ""))
      ) {
        score += 5;
        signals.push("Provided profile URL matches");
      }
    } catch {
      // Profile URL was validated server-side; ignore client-only URL failures.
    }
  }

  if (
    result.sourceType === "professional" ||
    result.sourceType === "social"
  ) {
    score += 1;
    signals.push("Result is an identity-bearing profile source");
  }

  return { score, signals: [...new Set(signals)], conflicts };
}

function confidence(score: number): "high" | "medium" | "low" {
  if (score >= 8) return "high";
  if (score >= 5) return "medium";
  return "low";
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `candidate-${(hash >>> 0).toString(16)}`;
}

function relatedByAnchor(anchor: SearchResult, candidate: SearchResult): boolean {
  if (anchor.url === candidate.url) return true;

  try {
    const anchorHost = new URL(anchor.url).hostname.replace(/^www\./, "");
    const candidateHost = new URL(candidate.url).hostname.replace(/^www\./, "");
    if (anchorHost === candidateHost) return true;
  } catch {
    return false;
  }

  const anchorTokens = new Set(words(`${anchor.title} ${anchor.snippet}`));
  const candidateTokens = words(
    `${candidate.title} ${candidate.snippet}`,
  );
  const overlap = candidateTokens.filter((token) => anchorTokens.has(token));
  return overlap.length >= 3;
}

export function buildIdentityCandidates(
  results: SearchResult[],
  input: Pick<
    SearchInput,
    "name" | "location" | "company" | "username" | "profileUrl"
  >,
): IdentityCandidate[] {
  if (results.length === 0) return [];

  const scored = results
    .map((result) => ({
      result,
      ...scoreResult(result, input),
    }))
    .sort((a, b) => b.score - a.score);

  const anchors = scored.filter(
    (entry) =>
      entry.score >= 5 ||
      entry.result.sourceType === "professional" ||
      entry.result.sourceType === "social",
  );

  const seeds = (anchors.length > 0 ? anchors : scored).slice(0, 5);
  const candidates: IdentityCandidate[] = [];
  const consumed = new Set<string>();

  const hasExplicitContext = Boolean(
    input.location || input.company || input.username || input.profileUrl,
  );

  if (hasExplicitContext) {
    const contextual = scored.filter((entry) => entry.score >= 6);
    if (contextual.length >= 2) {
      const sources = contextual.slice(0, 10).map((entry) => entry.result);
      const best = contextual[0]!;
      candidates.push({
        id: stableId(`context:${best.result.url}`),
        label: `${input.name} — context match`,
        summary:
          best.result.snippet ||
          "Multiple sources match the context you provided.",
        confidence: confidence(best.score + 1),
        supportingSignals: [
          ...new Set(contextual.flatMap((entry) => entry.signals)),
        ].slice(0, 8),
        conflictingSignals: [],
        sources,
      });
      for (const source of sources) consumed.add(source.url);
    }
  }

  for (const seed of seeds) {
    if (consumed.has(seed.result.url)) continue;

    const sources = scored
      .filter(
        (entry) =>
          !consumed.has(entry.result.url) &&
          relatedByAnchor(seed.result, entry.result),
      )
      .slice(0, 6)
      .map((entry) => entry.result);

    for (const source of sources) consumed.add(source.url);

    candidates.push({
      id: stableId(seed.result.url),
      label: seed.result.title || input.name,
      summary:
        seed.result.snippet || "Potential identity match from public sources.",
      confidence: confidence(seed.score),
      supportingSignals: seed.signals,
      conflictingSignals: seed.conflicts,
      sources: sources.length > 0 ? sources : [seed.result],
    });

    if (candidates.length >= 5) break;
  }

  return candidates;
}
