import type {
  ConfirmedIdentity,
  SearchContext,
  SearchInput,
  SearchMode,
} from "@/types/search";

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;
const ALLOWED_CONTEXTS = new Set<SearchContext>([
  "dating",
  "business",
  "professional",
  "community",
  "online",
  "other",
]);

type ValidationResult =
  | { ok: true; data: SearchInput }
  | { ok: false; error: string };

function cleanText(
  value: unknown,
  field: string,
  maxLength: number,
  required = false,
): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new Error(\`\${field} is required.\`);
    }
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(\`\${field} must be text.\`);
  }

  const cleaned = value.replace(/\s+/g, " ").trim();

  if (required && cleaned.length < 2) {
    throw new Error(\`\${field} must contain at least 2 characters.\`);
  }

  if (cleaned.length > maxLength) {
    throw new Error(\`\${field} is too long.\`);
  }

  if (CONTROL_CHARACTERS.test(cleaned)) {
    throw new Error(\`\${field} contains unsupported characters.\`);
  }

  return cleaned || undefined;
}

function cleanUrl(value: unknown): string | undefined {
  const cleaned = cleanText(value, "Profile URL", 500);
  if (!cleaned) return undefined;

  try {
    const parsed = new URL(cleaned);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Profile URL must use http or https.");
    }
    return parsed.toString();
  } catch {
    throw new Error("Profile URL must be a valid http(s) URL.");
  }
}

function cleanMode(value: unknown): SearchMode {
  if (value === "identity" || value === "deep") return value;
  throw new Error("Search mode is invalid.");
}

function cleanContext(value: unknown): SearchContext | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !ALLOWED_CONTEXTS.has(value as SearchContext)) {
    throw new Error("Search context is invalid.");
  }
  return value as SearchContext;
}

function cleanConfirmedIdentity(value: unknown): ConfirmedIdentity | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Confirmed identity is invalid.");
  }

  const record = value as Record<string, unknown>;
  const label = cleanText(record.label, "Confirmed identity label", 240, true)!;
  const confidence =
    record.confidence === "high" ||
    record.confidence === "medium" ||
    record.confidence === "low"
      ? record.confidence
      : "low";

  const supportingSignals = Array.isArray(record.supportingSignals)
    ? record.supportingSignals
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];

  const urls = Array.isArray(record.urls)
    ? record.urls
        .filter((item): item is string => typeof item === "string")
        .filter((item) => {
          try {
            const parsed = new URL(item);
            return ["http:", "https:"].includes(parsed.protocol);
          } catch {
            return false;
          }
        })
        .slice(0, 12)
    : [];

  return { label, confidence, supportingSignals, urls };
}

export function validateSearchRequest(payload: unknown): ValidationResult {
  try {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { ok: false, error: "Request body must be a JSON object." };
    }

    const record = payload as Record<string, unknown>;
    const mode = cleanMode(record.mode);

    if (record.lawfulUseAccepted !== true) {
      return {
        ok: false,
        error: "You must confirm responsible and lawful use before searching.",
      };
    }

    const data: SearchInput = {
      name: cleanText(record.name, "Full name", 120, true)!,
      location: cleanText(record.location, "Location", 160),
      company: cleanText(record.company, "Employer or organization", 180),
      username: cleanText(record.username, "Username", 120),
      profileUrl: cleanUrl(record.profileUrl),
      claim: cleanText(record.claim, "Claim", 300),
      context: cleanContext(record.context),
      mode,
      lawfulUseAccepted: true,
      confirmedIdentity: cleanConfirmedIdentity(record.confirmedIdentity),
    };

    if (mode === "deep" && !data.confirmedIdentity) {
      return {
        ok: false,
        error: "A confirmed identity is required for a deep search.",
      };
    }

    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid request.",
    };
  }
}
