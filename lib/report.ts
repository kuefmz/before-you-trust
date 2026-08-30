import type { SearchResult } from "@/types/search";

export interface ReportSection {
  id:
    | "identity"
    | "official"
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
        "Government, court, regulator, registry, or credential-oriented search results. Open the original source before drawing conclusions.",
      results: results.filter(
        (result) =>
          result.sourceType === "official" || includesKind(result, "official"),
      ),
    },
    {
      id: "professional",
      title: "Professional & organizational footprint",
      description:
        "Professional profiles and sources related to employers, organizations, publications, or public work.",
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
        "News-oriented results and public mentions. Source quality matters more than the number of mentions.",
      results: results.filter(
        (result) => result.sourceType === "news" || includesKind(result, "news"),
      ),
    },
    {
      id: "claim",
      title: "Claim-verification leads",
      description:
        "Sources returned for the specific claim you asked to check. These are leads to review, not an automatic verification.",
      results: results.filter((result) => includesKind(result, "claim")),
    },
    {
      id: "concern",
      title: "Needs closer review",
      description:
        "These sources were returned by concern-oriented searches. Their presence is not evidence of wrongdoing, and allegations must not be treated as facts.",
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
      description: "Additional results that may provide useful context.",
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
        "No result was returned for the claim-specific query. This does not prove the claim is false.",
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
        "Multiple results may help corroborate the claim, but they still require source-by-source review.",
    };
  }

  return {
    label: "One potentially relevant source",
    detail:
      "A single result may be relevant to the claim. One source alone is not enough to establish the claim as fact.",
  };
}
