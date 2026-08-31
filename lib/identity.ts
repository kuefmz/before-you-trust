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

const DISCOVERY_NAME_BLOCKLIST = new Set([
  "the",
  "a",
  "an",
  "netflix",
  "documentary",
  "documentaries",
  "series",
  "episode",
  "episodes",
  "puppet",
  "master",
  "hunting",
  "ultimate",
  "conman",
  "conmen",
  "official",
  "site",
  "profile",
  "public",
  "professional",
  "personal",
  "page",
  "news",
  "interview",
  "conference",
  "facebook",
  "instagram",
  "linkedin",
  "github",
  "tiktok",
  "youtube",
  "reddit",
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

function nameParts(value: string): string[] {
  return normalize(value)
    .split(/[\s._-]+/)
    .map((word) => word.replace(/^@+|@+$/g, ""))
    .filter((word) => word.length > 1);
}

function contentText(result: SearchResult): string {
  return normalize(`${result.title} ${result.snippet}`);
}

function urlText(result: SearchResult): string {
  return normalize(result.url);
}

function profileUrlContainsName(
  result: SearchResult,
  inputName: string,
): boolean {
  if (
    result.sourceType !== "professional" &&
    result.sourceType !== "social"
  ) {
    return false;
  }

  const expected = nameParts(inputName);
  if (expected.length < 2) return false;

  try {
    const parsed = new URL(result.url);
    const pathTokens = nameParts(
      decodeURIComponent(parsed.pathname.replace(/\+/g, " ")),
    );
    return expected.every((part) => pathTokens.includes(part));
  } catch {
    return false;
  }
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

  if (!nameEvidence && profileUrlContainsName(result, input.name)) {
    score += 2;
    nameEvidence = true;
    signals.push("Name appears in the public profile URL");
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

function resultHost(result: SearchResult): string {
  try {
    return new URL(result.url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return result.url;
  }
}

function extractRelatedNames(
  result: SearchResult,
  inputName: string,
): string[] {
  const inputParts = nameParts(inputName);
  const firstInputPart = inputParts[0];
  if (!firstInputPart) return [];

  const raw = `${result.title}. ${result.snippet}`;
  const matches =
    raw.match(
      /\b\p{Lu}[\p{L}'’-]+(?:\s+\p{Lu}[\p{L}'’-]+){1,3}\b/gu,
    ) ?? [];

  const candidates = matches
    .map((value) => value.replace(/[.,;:!?]+$/g, "").trim())
    .filter((value) => {
      const parts = nameParts(value);
      if (parts.length < 2 || parts.length > 4) return false;
      if (!parts.includes(firstInputPart)) return false;
      if (
        parts.some(
          (part) =>
            DISCOVERY_NAME_BLOCKLIST.has(part) &&
            !inputParts.includes(part),
        )
      ) {
        return false;
      }
      return normalize(value) !== normalize(inputName);
    });

  return [...new Set(candidates)];
}

function relatedNamesCompatible(left: string, right: string): boolean {
  const leftParts = nameParts(left);
  const rightParts = nameParts(right);
  if (!leftParts.length || !rightParts.length) return false;
  if (leftParts[0] !== rightParts[0]) return false;

  const leftFamily = new Set(leftParts.slice(1));
  return rightParts.slice(1).some((part) => leftFamily.has(part));
}

function buildLowConfidenceCandidates(
  scored: Array<{
    result: SearchResult;
    score: number;
    signals: string[];
    conflicts: string[];
    nameEvidence: boolean;
    exactNameInTitle: boolean;
    contextEvidence: boolean;
    profileEvidence: boolean;
  }>,
  input: Pick<SearchInput, "name" | "location" | "company">,
): IdentityCandidate[] {
  const candidates: IdentityCandidate[] = [];
  const consumed = new Set<string>();

  const possible = scored.filter((entry) => {
    // Never surface potentially damaging/interpretive material merely as an
    // identity guess. Low-confidence fallback is for neutral identity leads.
    if (
      entry.result.sourceType === "news" ||
      entry.result.sourceType === "official" ||
      entry.result.queryKinds.some((kind) =>
        ["news", "official", "concern", "claim"].includes(kind),
      )
    ) {
      return false;
    }

    const identityBearing =
      entry.result.sourceType === "professional" ||
      entry.result.sourceType === "social";
    const cameFromIdentityQuery = entry.result.queryKinds.some((kind) =>
      ["identity", "social", "professional"].includes(kind),
    );

    // If YaCy gives us a poor title/snippet, a neutral profile result returned
    // from a name-specific identity/social query is still useful as an
    // explicitly unverified lead for the user to inspect.
    return (
      entry.profileEvidence ||
      entry.exactNameInTitle ||
      (identityBearing && entry.nameEvidence) ||
      (identityBearing && cameFromIdentityQuery)
    );
  });

  for (const seed of possible) {
    if (consumed.has(seed.result.url)) continue;

    const sources = possible
      .filter(
        (entry) =>
          !consumed.has(entry.result.url) &&
          relatedByAnchor(seed.result, entry.result, input.name),
      )
      .slice(0, 4)
      .map((entry) => entry.result);

    for (const source of sources) consumed.add(source.url);

    const missingContext: string[] = [];
    if (input.location && !seed.contextEvidence) {
      missingContext.push("location");
    }
    if (input.company && !seed.contextEvidence) {
      missingContext.push("employer");
    }

    candidates.push({
      id: stableId(`low:${seed.result.url}`),
      label: seed.exactNameInTitle
        ? seed.result.title || input.name
        : `${input.name} — unverified profile lead`,
      searchName: input.name,
      summary:
        seed.result.snippet ||
        "This neutral profile was returned by a name-specific search, but its identity could not be confirmed from the available metadata.",
      confidence: "low",
      supportingSignals: [
        ...seed.signals,
        seed.nameEvidence
          ? "Some name evidence is present"
          : "Returned by a name-specific professional/social search; name is not confirmed in the available snippet",
        missingContext.length > 0
          ? `${missingContext.join(" and ")} context is not confirmed`
          : "Identity context is limited",
      ].filter((signal, index, all) => all.indexOf(signal) === index),
      conflictingSignals: seed.conflicts,
      sources: sources.length > 0 ? sources : [seed.result],
    });

    if (candidates.length >= 4) break;
  }

  return candidates;
}

function buildRelatedIdentityCandidates(
  results: SearchResult[],
  inputName: string,
): IdentityCandidate[] {
  const inputWords = words(inputName);
  const discoveries: Array<{ name: string; source: SearchResult }> = [];

  for (const result of results) {
    for (const name of extractRelatedNames(result, inputName)) {
      discoveries.push({ name, source: result });
    }
  }

  const groups: Array<{ name: string; sources: SearchResult[] }> = [];

  for (const discovery of discoveries) {
    const group = groups.find((candidate) =>
      relatedNamesCompatible(candidate.name, discovery.name),
    );

    if (group) {
      if (
        nameParts(discovery.name).length > nameParts(group.name).length
      ) {
        group.name = discovery.name;
      }
      if (!group.sources.some((source) => source.url === discovery.source.url)) {
        group.sources.push(discovery.source);
      }
    } else {
      groups.push({ name: discovery.name, sources: [discovery.source] });
    }
  }

  return groups
    .map((group) => {
      const hosts = new Set(group.sources.map(resultHost));
      const searchTermsTogether = group.sources.some((source) => {
        const text = contentText(source);
        return (
          inputWords.length >= 2 &&
          inputWords.every((word) => text.includes(word))
        );
      });

      const corroborated = hosts.size >= 2 || searchTermsTogether;
      return {
        group,
        hosts,
        corroborated,
      };
    })
    .filter(({ corroborated }) => corroborated)
    .sort((a, b) => {
      if (b.hosts.size !== a.hosts.size) return b.hosts.size - a.hosts.size;
      return b.group.sources.length - a.group.sources.length;
    })
    .slice(0, 5)
    .map(({ group, hosts }) => ({
      id: stableId(`related:${normalize(group.name)}`),
      label: group.name,
      searchName: group.name,
      summary:
        group.sources[0]?.snippet ||
        "A related identity name appears in the public search results.",
      confidence: hosts.size >= 2 ? "medium" : "low",
      supportingSignals: [
        hosts.size >= 2
          ? `Related name appears across ${hosts.size} independent domains`
          : "Related name appears in a source matching the original search terms",
        "Search name may be incomplete, approximate, or an alias",
      ],
      conflictingSignals: [],
      sources: group.sources.slice(0, 6),
    }));
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

    if (identityBearing && entry.exactNameInTitle) return true;
    if (hasProvidedContext) return false;

    return entry.exactNameInTitle && entry.score >= 5;
  });

  if (eligible.length === 0) {
    const related = buildRelatedIdentityCandidates(results, input.name);
    if (related.length > 0) return related;

    return buildLowConfidenceCandidates(scored, input);
  }

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
      searchName: input.name,
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
