import {
  containsExactFullName,
  urlPathContainsExactFullName,
} from "@/lib/exact-name";
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
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}@._ -]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value?: string): string[] {
  if (!value) return [];
  return normalize(value)
    .split(/[\s._-]+/)
    .map((word) => word.replace(/^@+|@+$/g, ""))
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function contentText(result: SearchResult): string {
  return `${result.title} ${result.snippet}`;
}

function urlText(result: SearchResult): string {
  return normalize(result.url);
}

function resultUrlContainsExactName(
  result: SearchResult,
  inputName: string,
): boolean {
  return urlPathContainsExactFullName(result.url, inputName);
}

interface ResultScore {
  score: number;
  signals: string[];
  conflicts: string[];
  nameEvidence: boolean;
  exactNameInTitle: boolean;
  contextEvidence: boolean;
  profileEvidence: boolean;
}

function scoreResult(
  result: SearchResult,
  input: Pick<
    SearchInput,
    "name" | "location" | "company" | "profileUrl" | "socialProfiles"
  >,
): ResultScore {
  const text = contentText(result);
  const normalizedText = normalize(text);
  const url = urlText(result);
  let score = 0;
  let nameEvidence = false;
  let exactNameInTitle = false;
  let contextEvidence = false;
  let profileEvidence = false;
  const signals: string[] = [];
  const conflicts: string[] = [];

  if (containsExactFullName(result.title, input.name)) {
    score += 6;
    nameEvidence = true;
    exactNameInTitle = true;
    signals.push("Exact full name appears in the result title");
  } else if (containsExactFullName(text, input.name)) {
    score += 5;
    nameEvidence = true;
    signals.push("Exact full name appears in the page title or snippet");
  }

  if (!nameEvidence && resultUrlContainsExactName(result, input.name)) {
    score += 4;
    nameEvidence = true;
    signals.push("Exact full name appears in the public result URL");
  }

  if (input.location) {
    const locationWords = words(input.location);
    const matched = locationWords.filter((word) =>
      normalizedText.includes(word),
    );
    if (matched.length > 0) {
      score += 2;
      contextEvidence = true;
      signals.push("Location context matches");
    }
  }

  if (input.company) {
    const companyWords = words(input.company);
    const matched = companyWords.filter((word) =>
      normalizedText.includes(word),
    );
    if (matched.length > 0) {
      score += 3;
      contextEvidence = true;
      signals.push("Employer or organization context matches");
    }
  }

  for (const social of input.socialProfiles ?? []) {
    const normalizedSocial = normalize(social);
    if (
      normalizedSocial &&
      `${normalizedText} ${url}`.includes(
        normalizedSocial.replace(/^@/, ""),
      )
    ) {
      score += 4;
      contextEvidence = true;
      profileEvidence = true;
      signals.push("Known social profile or handle matches");
      break;
    }

    if (/^https?:\/\//i.test(social)) {
      try {
        const expected = new URL(social);
        const actual = new URL(result.url);
        const expectedPath = expected.pathname.replace(/\/+$/, "");
        if (
          expected.hostname === actual.hostname &&
          expectedPath !== "/" &&
          (actual.pathname === expectedPath ||
            actual.pathname.startsWith(`${expectedPath}/`))
        ) {
          score += 6;
          contextEvidence = true;
          profileEvidence = true;
          signals.push("Known social profile URL matches");
          break;
        }
      } catch {
        // Social profile URLs are validated elsewhere.
      }
    }
  }

  if (result.queryKinds.includes("image")) {
    score += 3;
    contextEvidence = true;
    signals.push("Uploaded photo matched this public web page");
  }

  if (input.profileUrl) {
    try {
      const expected = new URL(input.profileUrl);
      const actual = new URL(result.url);
      const expectedPath = expected.pathname.replace(/\/+$/, "");
      if (
        expected.hostname === actual.hostname &&
        expectedPath !== "/" &&
        (actual.pathname === expectedPath ||
          actual.pathname.startsWith(`${expectedPath}/`))
      ) {
        score += 7;
        contextEvidence = true;
        profileEvidence = true;
        signals.push("Provided profile URL matches");
      }
    } catch {
      // Profile URL is validated elsewhere.
    }
  }

  if (
    nameEvidence &&
    (result.sourceType === "professional" || result.sourceType === "social")
  ) {
    score += 1;
    signals.push("Result is an identity-bearing profile source");
  }

  return {
    score,
    signals: [...new Set(signals)],
    conflicts,
    nameEvidence,
    exactNameInTitle,
    contextEvidence,
    profileEvidence,
  };
}

function candidateConfidence(
  entry: ResultScore,
  hasProvidedContext: boolean,
): "high" | "medium" | "low" {
  if (entry.profileEvidence && entry.nameEvidence && entry.contextEvidence) {
    return "high";
  }

  if (hasProvidedContext && !entry.contextEvidence) {
    return "low";
  }

  if (entry.score >= 9) return "high";
  if (entry.score >= 6) return "medium";
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

function identityKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;

    if (host === "linkedin.com" && segments[0] === "in" && segments[1]) {
      return `${host}/in/${segments[1].toLowerCase()}`;
    }

    if (
      [
        "github.com",
        "instagram.com",
        "tiktok.com",
        "x.com",
        "twitter.com",
        "youtube.com",
      ].includes(host)
    ) {
      return `${host}/${segments[0]!.toLowerCase()}`;
    }

    if (host === "facebook.com" && segments[0]) {
      return `${host}/${segments[0].toLowerCase()}`;
    }

    return `${host}/${segments.slice(0, 2).join("/").toLowerCase()}`;
  } catch {
    return null;
  }
}

function relatedByAnchor(
  anchor: SearchResult,
  candidate: SearchResult,
  inputName: string,
): boolean {
  if (anchor.url === candidate.url) return true;

  const anchorKey = identityKey(anchor.url);
  const candidateKey = identityKey(candidate.url);
  if (anchorKey && candidateKey && anchorKey === candidateKey) return true;

  const nameTokens = new Set(words(inputName));
  const anchorTokens = new Set(
    words(contentText(anchor)).filter((token) => !nameTokens.has(token)),
  );
  const contextualOverlap = words(contentText(candidate))
    .filter((token) => !nameTokens.has(token))
    .filter((token) => anchorTokens.has(token));

  return new Set(contextualOverlap).size >= 2;
}

function sourceLabel(result: SearchResult, inputName: string): string {
  if (containsExactFullName(result.title, inputName)) {
    return result.title;
  }

  try {
    const host = new URL(result.url).hostname
      .replace(/^www\./, "")
      .replace(/\.com$/, "");
    if (result.sourceType === "professional" || result.sourceType === "social") {
      return `${inputName} — ${host} profile`;
    }
  } catch {
    // Fall through.
  }

  return inputName;
}

export function buildIdentityCandidates(
  results: SearchResult[],
  input: Pick<
    SearchInput,
    "name" | "location" | "company" | "profileUrl" | "socialProfiles"
  >,
): IdentityCandidate[] {
  if (results.length === 0) return [];

  const hasProvidedContext = Boolean(
    input.location ||
      input.company ||
      input.profileUrl ||
      (input.socialProfiles?.length ?? 0) > 0,
  );

  const scored = results
    .map((result) => ({
      result,
      ...scoreResult(result, input),
    }))
    .filter((entry) => entry.nameEvidence || entry.profileEvidence)
    .sort((a, b) => {
      const confidenceDifference =
        ({ high: 3, medium: 2, low: 1 }[
          candidateConfidence(b, hasProvidedContext)
        ] ?? 0) -
        ({ high: 3, medium: 2, low: 1 }[
          candidateConfidence(a, hasProvidedContext)
        ] ?? 0);
      if (confidenceDifference !== 0) return confidenceDifference;
      return b.score - a.score;
    });

  if (scored.length === 0) return [];

  const candidates: IdentityCandidate[] = [];
  const consumed = new Set<string>();

  for (const seed of scored.slice(0, 8)) {
    if (consumed.has(seed.result.url)) continue;

    const sources = scored
      .filter(
        (entry) =>
          !consumed.has(entry.result.url) &&
          relatedByAnchor(seed.result, entry.result, input.name),
      )
      .slice(0, 6)
      .map((entry) => entry.result);

    for (const source of sources) consumed.add(source.url);

    candidates.push({
      id: stableId(seed.result.url),
      label: sourceLabel(seed.result, input.name),
      searchName: input.name,
      summary:
        seed.result.snippet ||
        "Exact-name public profile or page. Additional context is needed to distinguish namesakes.",
      confidence: candidateConfidence(seed, hasProvidedContext),
      supportingSignals: seed.signals,
      conflictingSignals: seed.conflicts,
      sources: sources.length > 0 ? sources : [seed.result],
    });

    if (candidates.length >= 5) break;
  }

  return candidates;
}
