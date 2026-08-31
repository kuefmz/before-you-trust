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
    .map((word) => word.replace(/^[.@_-]+|[.@_-]+$/g, ""))
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function contentText(result: SearchResult): string {
  return normalize(`${result.title} ${result.snippet}`);
}

function urlText(result: SearchResult): string {
  return normalize(result.url);
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
  const url = urlText(result);
  const title = normalize(result.title);
  const name = normalize(input.name);
  const nameWords = words(input.name);
  let score = 0;
  let nameEvidence = false;
  let exactNameInTitle = false;
  let contextEvidence = false;
  let profileEvidence = false;
  const signals: string[] = [];
  const conflicts: string[] = [];

  if (name && title.includes(name)) {
    score += 5;
    nameEvidence = true;
    exactNameInTitle = true;
    signals.push("Full name appears in the result title");
  } else {
    const matches = nameWords.filter((word) => text.includes(word)).length;
    if (matches === nameWords.length && matches >= 2) {
      score += 3;
      nameEvidence = true;
      signals.push("All name terms appear in the page title or snippet");
    }
  }

  if (input.location) {
    const locationWords = words(input.location);
    const matched = locationWords.filter((word) => text.includes(word));
    if (matched.length > 0) {
      score += 2;
      contextEvidence = true;
      signals.push("Location context matches");
    }
  }

  if (input.company) {
    const companyWords = words(input.company);
    const matched = companyWords.filter((word) => text.includes(word));
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
      `${text} ${url}`.includes(normalizedSocial.replace(/^@/, ""))
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
          score += 5;
          contextEvidence = true;
          profileEvidence = true;
          signals.push("Known social profile URL matches");
          break;
        }
      } catch {
        // Social profile URLs were validated server-side.
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
        score += 6;
        contextEvidence = true;
        profileEvidence = true;
        signals.push("Provided profile URL matches");
      }
    } catch {
      // Profile URL was validated server-side; ignore client-only URL failures.
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
    words(`${anchor.title} ${anchor.snippet}`).filter(
      (token) => !nameTokens.has(token),
    ),
  );
  const contextualOverlap = words(`${candidate.title} ${candidate.snippet}`)
    .filter((token) => !nameTokens.has(token))
    .filter((token) => anchorTokens.has(token));

  return new Set(contextualOverlap).size >= 2;
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
    .sort((a, b) => b.score - a.score);

  const eligible = scored.filter((entry) => {
    if (!entry.nameEvidence && !entry.profileEvidence) return false;
    if (entry.profileEvidence || entry.contextEvidence) return true;

    const identityBearing =
      entry.result.sourceType === "professional" ||
      entry.result.sourceType === "social";

    // A same-name LinkedIn/social profile is still useful as a namesake
    // candidate even when its snippet lacks the supplied city/employer.
    if (identityBearing && entry.exactNameInTitle) return true;

    // Generic web pages need corroborating context when the user supplied any.
    if (hasProvidedContext) return false;

    return entry.exactNameInTitle && entry.score >= 5;
  });

  if (eligible.length === 0) return [];

  const seeds = eligible.slice(0, 6);
  const candidates: IdentityCandidate[] = [];
  const consumed = new Set<string>();

  for (const seed of seeds) {
    if (consumed.has(seed.result.url)) continue;

    const sources = eligible
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
