import type {
  ConfirmedIdentity,
  SearchContext,
  SearchResult,
  SourceType,
} from "@/types/search";

const SOURCE_TYPES = new Set<SourceType>([
  "official",
  "professional",
  "social",
  "news",
  "personal",
  "web",
]);

const CONTEXTS = new Set<SearchContext>([
  "dating",
  "business",
  "professional",
  "community",
  "online",
  "other",
]);

export interface ReportEmailRequest {
  email: string;
  reportLabel: string;
  searchedName: string;
  location?: string;
  company?: string;
  profileUrl?: string;
  socialProfiles?: string[];
  claim?: string;
  context?: SearchContext;
  confirmedIdentity?: ConfirmedIdentity;
  searchQueries?: string[];
  results: Array<Pick<SearchResult, "title" | "url" | "snippet" | "sourceType">>;
  consentAccepted: true;
  website?: string;
}

type ValidationResult =
  | { ok: true; data: ReportEmailRequest }
  | { ok: false; error: string };

function cleanOptionalText(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function cleanStringList(
  value: unknown,
  maxItems: number,
  maxLength: number,
): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .map((item) => item.slice(0, maxLength)),
    ),
  ].slice(0, maxItems);
  return cleaned.length ? cleaned : undefined;
}

function cleanConfirmedIdentity(value: unknown): ConfirmedIdentity | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const label = cleanOptionalText(record.label, 240);
  if (!label) return undefined;

  const confidence =
    record.confidence === "high" ||
    record.confidence === "medium" ||
    record.confidence === "low"
      ? record.confidence
      : "low";

  const supportingSignals =
    cleanStringList(record.supportingSignals, 12, 300) ?? [];

  const urls = (cleanStringList(record.urls, 12, 1000) ?? []).filter((url) => {
    try {
      return ["http:", "https:"].includes(new URL(url).protocol);
    } catch {
      return false;
    }
  });

  return { label, confidence, supportingSignals, urls };
}

export function validateReportEmailRequest(payload: unknown): ValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Request must be a JSON object." };
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.website === "string" && record.website.trim()) {
    return { ok: false, error: "Request could not be accepted." };
  }

  if (record.consentAccepted !== true) {
    return { ok: false, error: "Please confirm how your email will be used." };
  }

  if (
    typeof record.email !== "string" ||
    record.email.length > 240 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email.trim())
  ) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  const reportLabel = cleanOptionalText(record.reportLabel, 240);
  const searchedName = cleanOptionalText(record.searchedName, 120);
  if (!reportLabel || !searchedName) {
    return { ok: false, error: "Report identity is invalid." };
  }

  if (!Array.isArray(record.results) || record.results.length === 0) {
    return { ok: false, error: "There is no report content to email." };
  }

  const results = record.results.slice(0, 70).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];

    const value = item as Record<string, unknown>;
    if (
      typeof value.title !== "string" ||
      typeof value.url !== "string" ||
      typeof value.sourceType !== "string" ||
      !SOURCE_TYPES.has(value.sourceType as SourceType)
    ) {
      return [];
    }

    try {
      const url = new URL(value.url);
      if (!["http:", "https:"].includes(url.protocol)) return [];

      return [{
        title: value.title.trim().slice(0, 300),
        url: url.toString(),
        snippet:
          typeof value.snippet === "string"
            ? value.snippet.trim().slice(0, 800)
            : "",
        sourceType: value.sourceType as SourceType,
      }];
    } catch {
      return [];
    }
  });

  if (!results.length) {
    return { ok: false, error: "There is no valid report content to email." };
  }

  const context =
    typeof record.context === "string" &&
    CONTEXTS.has(record.context as SearchContext)
      ? (record.context as SearchContext)
      : undefined;

  return {
    ok: true,
    data: {
      email: record.email.trim(),
      reportLabel,
      searchedName,
      location: cleanOptionalText(record.location, 160),
      company: cleanOptionalText(record.company, 180),
      profileUrl: cleanOptionalText(record.profileUrl, 500),
      socialProfiles: cleanStringList(record.socialProfiles, 8, 500),
      claim: cleanOptionalText(record.claim, 300),
      context,
      confirmedIdentity: cleanConfirmedIdentity(record.confirmedIdentity),
      searchQueries: cleanStringList(record.searchQueries, 50, 800),
      results,
      consentAccepted: true,
    },
  };
}

export function renderReportEmail(data: ReportEmailRequest): string {
  const lines = [
    "BEFORE YOU TRUST — TRUST BRIEF",
    "",
    `Subject searched: ${data.searchedName}`,
    `Selected identity: ${data.reportLabel}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "Important: This report contains only public-web findings that passed the identity-quality filter for the selected person. It may still be incomplete or incorrect. A missing record does not prove safety, and an allegation does not prove wrongdoing. Review every original source before making a decision.",
    "",
    `PUBLIC SOURCES (${data.results.length})`,
    "",
  ];

  data.results.forEach((result, index) => {
    lines.push(
      `${index + 1}. [${result.sourceType.toUpperCase()}] ${result.title}`,
      result.url,
    );
    if (result.snippet) lines.push(result.snippet);
    lines.push("");
  });

  lines.push(
    "Before You Trust does not assign a person-level trustworthiness or danger score.",
  );

  return lines.join("\n").slice(0, 48_000);
}

export function buildAppsScriptPayload(
  data: ReportEmailRequest,
  apiSecret: string,
): Record<string, unknown> {
  return {
    apiSecret,
    requestId: crypto.randomUUID(),
    userEmail: data.email,
    searchedName: data.searchedName,
    location: data.location ?? "",
    company: data.company ?? "",
    profileUrl: data.profileUrl ?? "",
    socialProfiles: data.socialProfiles ?? [],
    claim: data.claim ?? "",
    context: data.context ?? "",
    confirmedIdentity: data.confirmedIdentity ?? {},
    searchQueries: data.searchQueries ?? [],
    reportText: renderReportEmail(data),
    sourceUrls: data.results.map((result) => result.url),
  };
}
