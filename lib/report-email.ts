import type { SearchResult, SourceType } from "@/types/search";

const SOURCE_TYPES = new Set<SourceType>([
  "official", "professional", "social", "news", "personal", "web",
]);

export interface ReportEmailRequest {
  email: string;
  reportLabel: string;
  results: Array<Pick<SearchResult, "title" | "url" | "snippet" | "sourceType">>;
  consentAccepted: true;
  website?: string;
}

type ValidationResult =
  | { ok: true; data: ReportEmailRequest }
  | { ok: false; error: string };

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
  if (typeof record.email !== "string" || record.email.length > 240 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email.trim())) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (typeof record.reportLabel !== "string" || record.reportLabel.trim().length < 2 || record.reportLabel.length > 240) {
    return { ok: false, error: "Report label is invalid." };
  }
  if (!Array.isArray(record.results) || record.results.length === 0) {
    return { ok: false, error: "There is no report content to email." };
  }

  const results = record.results.slice(0, 70).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const value = item as Record<string, unknown>;
    if (typeof value.title !== "string" || typeof value.url !== "string" || typeof value.sourceType !== "string" || !SOURCE_TYPES.has(value.sourceType as SourceType)) return [];
    try {
      const url = new URL(value.url);
      if (!["http:", "https:"].includes(url.protocol)) return [];
      return [{
        title: value.title.trim().slice(0, 300),
        url: url.toString(),
        snippet: typeof value.snippet === "string" ? value.snippet.trim().slice(0, 800) : "",
        sourceType: value.sourceType as SourceType,
      }];
    } catch {
      return [];
    }
  });

  if (!results.length) return { ok: false, error: "There is no valid report content to email." };
  return {
    ok: true,
    data: {
      email: record.email.trim(),
      reportLabel: record.reportLabel.trim(),
      results,
      consentAccepted: true,
    },
  };
}

export function renderReportEmail(data: ReportEmailRequest): string {
  const lines = [
    "BEFORE YOU TRUST — TRUST BRIEF",
    "",
    `Subject searched: ${data.reportLabel}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "Important: This report summarizes public search results and may be incomplete or incorrect. A missing record does not prove safety, and an allegation does not prove wrongdoing. Review each original source before making a decision.",
    "",
    `PUBLIC SOURCES (${data.results.length})`,
    "",
  ];
  data.results.forEach((result, index) => {
    lines.push(`${index + 1}. [${result.sourceType.toUpperCase()}] ${result.title}`, result.url);
    if (result.snippet) lines.push(result.snippet);
    lines.push("");
  });
  lines.push("Before You Trust does not assign a person-level trustworthiness or danger score.");
  return lines.join("\n").slice(0, 55_000);
}