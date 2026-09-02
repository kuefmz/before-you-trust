import {
  containsExactFullName,
  urlPathContainsExactFullName,
} from "@/lib/exact-name";
import { normalizeUrl } from "@/lib/normalize";
import type { SearchInput, SearchResult } from "@/types/search";

export interface ReportSection {
  id:
    | "identity"
    | "official"
    | "social"
    | "professional"
    | "news"
    | "claim"
    | "concern"
    | "other";
  title: string;
  description: string;
  results: SearchResult[];
}

function includesKind(result: SearchResult, kind: SearchResult["queryKinds"][number]) {
  return result.queryKinds.includes(kind);
}

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}@._/-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulWords(value?: string): string[] {
  if (!value) return [];
  return normalizeText(value)
    .split(/[\s,./_-]+/)
    .filter((word) => word.length >= 3);
}

function resultText(result: SearchResult): string {
  return normalizeText(`${result.title} ${result.snippet} ${result.url}`);
}

function profileUrlContainsExactName(
  result: SearchResult,
  name: string,
): boolean {
  if (
    result.sourceType !== "professional" &&
    result.sourceType !== "social"
  ) {
    return false;
  }

  return urlPathContainsExactFullName(result.url, name);
}


function identityUrlAnchor(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (host === "linkedin.com" && segments[0] === "in" && segments[1]) {
      return normalizeText(segments[1]);
    }

    if (
      [
        "github.com",
        "instagram.com",
        "tiktok.com",
        "x.com",
        "twitter.com",
        "facebook.com",
        "youtube.com",
      ].includes(host) &&
      segments[0]
    ) {
      return normalizeText(segments[0].replace(/^@/, ""));
    }

    return null;
  } catch {
    return null;
  }
}

function urlMatchesKnownProfile(resultUrl: string, knownUrl?: string): boolean {
  if (!knownUrl) return false;

  try {
    const result = new URL(normalizeUrl(resultUrl));
    const known = new URL(normalizeUrl(knownUrl));
    const knownPath = known.pathname.replace(/\/+$/, "");

    return (
      result.hostname === known.hostname &&
      Boolean(knownPath) &&
      knownPath !== "/" &&
      (result.pathname === knownPath || result.pathname.startsWith(`${knownPath}/`))
    );
  } catch {
    return false;
  }
}

export function filterResultsForConfirmedIdentity(
  results: SearchResult[],
  selectedSources: SearchResult[],
  input: Pick<
    SearchInput,
    "name" | "location" | "company" | "profileUrl" | "socialProfiles"
  >,
): {
  results: SearchResult[];
  excludedResults: SearchResult[];
  excludedCount: number;
} {
  const selectedUrls = new Set(
    selectedSources.map((source) => normalizeUrl(source.url)),
  );
  const selectedAnchors = [
    ...new Set(
      selectedSources
        .map((source) => identityUrlAnchor(source.url))
        .filter((anchor): anchor is string => Boolean(anchor && anchor.length >= 4)),
    ),
  ];

  const name = input.name;
  const locationWords = meaningfulWords(input.location);
  const companyWords = meaningfulWords(input.company);
  const socialHandles = (input.socialProfiles ?? [])
    .filter((value) => !/^https?:\/\//i.test(value))
    .map((value) => normalizeText(value.replace(/^@/, "")))
    .filter((value) => value.length >= 3);

  const hasStrongContext =
    locationWords.length > 0 ||
    companyWords.length > 0 ||
    Boolean(input.profileUrl) ||
    (input.socialProfiles?.length ?? 0) > 0 ||
    selectedAnchors.length > 0;

  const kept = results.filter((result) => {
    if (selectedUrls.has(normalizeUrl(result.url))) return true;

    const text = resultText(result);
    const contentText = normalizeText(`${result.title} ${result.snippet}`);
    const exactNameInTitle = containsExactFullName(result.title, name);
    const exactNameAnywhere = containsExactFullName(
      `${result.title} ${result.snippet}`,
      name,
    );
    const exactNameInProfileUrl = profileUrlContainsExactName(result, name);
    const nameMatches =
      exactNameAnywhere ||
      exactNameInProfileUrl ||
      urlMatchesKnownProfile(result.url, input.profileUrl) ||
      (input.socialProfiles ?? [])
        .filter((value) => /^https?:\/\//i.test(value))
        .some((value) => urlMatchesKnownProfile(result.url, value));

    if (!nameMatches) return false;

    const locationMatches =
      locationWords.length > 0 &&
      locationWords.some((word) => contentText.includes(word));
    const companyMatches =
      companyWords.length > 0 &&
      companyWords.some((word) => contentText.includes(word));
    const knownProfileMatches =
      urlMatchesKnownProfile(result.url, input.profileUrl) ||
      (input.socialProfiles ?? [])
        .filter((value) => /^https?:\/\//i.test(value))
        .some((value) => urlMatchesKnownProfile(result.url, value));
    const handleMatches = socialHandles.some((handle) => text.includes(handle));
    const confirmedAnchorMatches = selectedAnchors.some((anchor) =>
      text.includes(anchor),
    );

    const contextMatches =
      locationMatches ||
      companyMatches ||
      knownProfileMatches ||
      handleMatches ||
      confirmedAnchorMatches;

    const sensitive = result.queryKinds.some((kind) =>
      ["official", "news", "concern", "claim"].includes(kind),
    );

    // Precision is deliberately favored over recall. Potentially reputation-
    // harming results must be tied to both the searched name and a confirmed
    // identity signal whenever such a signal is available.
    if (sensitive) {
      // A same-name sensitive hit is not enough. Without corroborating
      // identity context we prefer to omit it entirely rather than risk
      // attaching a damaging result to the wrong person.
      return hasStrongContext && contextMatches;
    }

    return hasStrongContext ? contextMatches : exactNameInTitle;
  });

  const keptUrls = new Set(kept.map((result) => normalizeUrl(result.url)));
  const excludedResults = results.filter(
    (result) => !keptUrls.has(normalizeUrl(result.url)),
  );

  return {
    results: kept,
    excludedResults,
    excludedCount: excludedResults.length,
  };
}

export function buildReportSections(results: SearchResult[]): ReportSection[] {
  const sections: ReportSection[] = [
    {
      id: "identity",
      title: "Identity & public footprint",
      description:
        "Sources that help establish whether the public footprint belongs to the selected person.",
      results: results.filter(
        (result) =>
          includesKind(result, "identity") ||
          result.sourceType === "social",
      ),
    },
    {
      id: "official",
      title: "Official & registry sources",
      description:
        "Government, court, regulator, registry, or credential-oriented results that passed the identity-quality filter. Open the original source before drawing conclusions.",
      results: results.filter(
        (result) =>
          result.sourceType === "official" || includesKind(result, "official"),
      ),
    },
    {
      id: "social",
      title: "Social-media & photo matches",
      description:
        "Public social profiles and pages connected to the selected identity. Treat these as leads to confirm, not proof by themselves.",
      results: results.filter(
        (result) =>
          result.sourceType === "social" ||
          includesKind(result, "social") ||
          includesKind(result, "image"),
      ),
    },
    {
      id: "professional",
      title: "Professional & organizational footprint",
      description:
        "Professional profiles and sources related to employers, organizations, publications, or public work that match the selected identity.",
      results: results.filter(
        (result) =>
          result.sourceType === "professional" ||
          includesKind(result, "professional"),
      ),
    },
    {
      id: "news",
      title: "News & public mentions",
      description:
        "News-oriented results that passed the identity-quality filter. Source quality matters more than the number of mentions.",
      results: results.filter(
        (result) => result.sourceType === "news" || includesKind(result, "news"),
      ),
    },
    {
      id: "claim",
      title: "Claim-verification leads",
      description:
        "Sources returned for the specific claim you asked to check and linked to the selected identity. These are leads to review, not automatic verification.",
      results: results.filter((result) => includesKind(result, "claim")),
    },
    {
      id: "concern",
      title: "Needs closer review",
      description:
        "Only concern-oriented results that also passed the identity-quality filter appear here. Their presence is still not evidence of wrongdoing.",
      results: results.filter((result) => includesKind(result, "concern")),
    },
  ];

  const alreadyIncluded = new Set(
    sections.flatMap((section) => section.results.map((result) => result.url)),
  );

  const other = results.filter((result) => !alreadyIncluded.has(result.url));
  if (other.length > 0) {
    sections.push({
      id: "other",
      title: "Other public sources",
      description:
        "Additional sources that passed the identity-quality filter and may provide useful context.",
      results: other,
    });
  }

  return sections.filter((section) => section.results.length > 0);
}

export function claimAssessment(results: SearchResult[]): {
  label: string;
  detail: string;
} | null {
  const claimResults = results.filter((result) =>
    result.queryKinds.includes("claim"),
  );

  if (claimResults.length === 0) {
    return {
      label: "Not corroborated by this search",
      detail:
        "No sufficiently identity-matched result was returned for the claim-specific query. This does not prove the claim is false.",
    };
  }

  if (claimResults.some((result) => result.sourceType === "official")) {
    return {
      label: "Official source found",
      detail:
        "At least one official-source result may be relevant to the claim. Review the source itself before treating the claim as verified.",
    };
  }

  if (claimResults.length >= 2) {
    return {
      label: "Multiple potentially relevant sources",
      detail:
        "Multiple identity-matched results may help corroborate the claim, but they still require source-by-source review.",
    };
  }

  return {
    label: "One potentially relevant source",
    detail:
      "A single identity-matched result may be relevant to the claim. One source alone is not enough to establish the claim as fact.",
  };
}
