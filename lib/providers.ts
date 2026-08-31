import { getRuntimeSetting } from "@/lib/runtime-config";

export interface ProviderSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string | null;
  provider: string;
}

interface SearchProvider {
  name: string;
  search(query: string, signal: AbortSignal): Promise<ProviderSearchResult[]>;
}

interface YacyItem {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string | null;
}

interface YacyChannel {
  items?: YacyItem[];
  item?: YacyItem | YacyItem[];
}

interface YacyPayload {
  channels?: YacyChannel | YacyChannel[];
  channel?: YacyChannel;
}

interface SearxngItem {
  title?: string;
  url?: string;
  content?: string;
  publishedDate?: string | null;
}

interface SearxngPayload {
  results?: SearxngItem[];
}

export class SearchConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchConfigurationError";
  }
}

function plainText(value: string | undefined): string {
  if (!value) return "";

  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function endpoint(baseUrl: string, path: string, variable: string): URL {
  try {
    const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const url = new URL(path, base);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("unsupported protocol");
    }
    return url;
  } catch {
    throw new SearchConfigurationError(
      `${variable} must be a valid http(s) URL.`,
    );
  }
}

function basicAuthHeaders(
  username?: string,
  password?: string,
): Record<string, string> {
  if (!username && !password) return {};
  if (!username || !password) {
    throw new SearchConfigurationError(
      "Configure both search username and password, or neither.",
    );
  }

  return {
    Authorization: `Basic ${Buffer.from(
      `${username}:${password}`,
      "utf8",
    ).toString("base64")}`,
  };
}

function yacyItems(payload: YacyPayload): YacyItem[] {
  const rawChannels = payload.channels ?? payload.channel ?? [];
  const channels = Array.isArray(rawChannels) ? rawChannels : [rawChannels];

  return channels.flatMap((channel) => {
    if (Array.isArray(channel.items)) return channel.items;
    if (Array.isArray(channel.item)) return channel.item;
    if (channel.item) return [channel.item];
    return [];
  });
}

function yacyProvider(config: {
  baseUrl: string;
  resource: "local" | "global";
  username?: string;
  password?: string;
}): SearchProvider {
  const searchEndpoint = endpoint(
    config.baseUrl,
    "yacysearch.json",
    "YACY_BASE_URL",
  );

  return {
    name: "yacy",
    async search(query, signal) {
      const url = new URL(searchEndpoint);
      url.searchParams.set("query", query);
      url.searchParams.set("resource", config.resource);
      url.searchParams.set("contentdom", "text");
      url.searchParams.set("maximumRecords", "10");
      url.searchParams.set("verify", "false");
      url.searchParams.set("nav", "none");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...basicAuthHeaders(config.username, config.password),
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(`YaCy request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as YacyPayload;

      return yacyItems(payload)
        .filter((item) => item.link)
        .map((item) => ({
          title: plainText(item.title) || item.link || "Untitled result",
          url: item.link!,
          snippet: plainText(item.description),
          publishedAt: item.pubDate ?? null,
          provider: "yacy",
        }));
    },
  };
}

function searxngProvider(config: {
  baseUrl: string;
  username?: string;
  password?: string;
}): SearchProvider {
  const searchEndpoint = endpoint(
    config.baseUrl,
    "search",
    "SEARXNG_BASE_URL",
  );

  return {
    name: "searxng",
    async search(query, signal) {
      const url = new URL(searchEndpoint);
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("categories", "general");
      url.searchParams.set("language", "all");
      url.searchParams.set("safesearch", "0");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...basicAuthHeaders(config.username, config.password),
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(
          `SearXNG request failed with status ${response.status}. Ensure JSON output is enabled in settings.yml.`,
        );
      }

      const payload = (await response.json()) as SearxngPayload;

      return (payload.results ?? [])
        .filter((item) => item.url)
        .slice(0, 12)
        .map((item) => ({
          title: plainText(item.title) || item.url || "Untitled result",
          url: item.url!,
          snippet: plainText(item.content),
          publishedAt: item.publishedDate ?? null,
          provider: "searxng",
        }));
    },
  };
}

function mockProvider(): SearchProvider {
  return {
    name: "mock",
    async search(query) {
      const lower = query.toLowerCase();
      const subject = query.match(/"([^"]+)"/)?.[1] ?? "Example Person";
      const slug = subject
        .toLocaleLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const company = lower.includes("ubs") ? "UBS" : "Example AG";

      if (lower.includes("court") || lower.includes("regulator")) {
        return [{
          title: `Example public registry result — ${subject}`,
          url: `https://registry.example.org/${slug}`,
          snippet: `${subject} in Zurich. Example-only registry fixture used for automated testing. No real person is represented.`,
          provider: "mock",
        }];
      }

      if (
        lower.includes("complaint") ||
        lower.includes("allegation") ||
        lower.includes("fraud")
      ) {
        return [{
          title: `Example news mention — ${subject}`,
          url: `https://news.example.org/${slug}`,
          snippet: `${subject} in Zurich. Example-only news fixture used for automated testing. The presence of this result is not a real allegation.`,
          provider: "mock",
        }];
      }

      if (
        lower.includes("instagram.com") ||
        lower.includes("tiktok.com") ||
        lower.includes("facebook.com") ||
        lower.includes("x.com")
      ) {
        return [{
          title: `${subject} — public social profile`,
          url: `https://www.instagram.com/${slug}/`,
          snippet: `${subject} public social profile. Zurich and ${company} are mentioned in the example fixture.`,
          provider: "mock",
        }];
      }

      return [
        {
          title: `${subject} — Professional profile`,
          url: `https://www.linkedin.com/in/${slug}`,
          snippet: `${subject}, data professional in Zurich at ${company}.`,
          provider: "mock",
        },
        {
          title: `${slug} · GitHub`,
          url: `https://github.com/${slug}`,
          snippet: `Public projects by ${subject}. ${company} and Zurich are mentioned in the profile.`,
          provider: "mock",
        },
        {
          title: `${subject} — Example conference`,
          url: `https://conference.example.org/speakers/${slug}`,
          snippet: `Speaker biography for ${subject}, based in Zurich.`,
          provider: "mock",
        },
      ];
    },
  };
}

async function configuredProviders(): Promise<SearchProvider[]> {
  let selection: string;
  let yacyBaseUrl: string;
  let yacyResource: string;
  let yacyUsername: string | undefined;
  let yacyPassword: string | undefined;
  let searxngBaseUrl: string;
  let searxngUsername: string | undefined;
  let searxngPassword: string | undefined;

  try {
    [
      selection,
      yacyBaseUrl,
      yacyResource,
      yacyUsername,
      yacyPassword,
      searxngBaseUrl,
      searxngUsername,
      searxngPassword,
    ] = await Promise.all([
      getRuntimeSetting("SEARCH_PROVIDER").then((value) => value ?? "auto"),
      getRuntimeSetting("YACY_BASE_URL").then(
        (value) => value ?? "http://localhost:8090",
      ),
      getRuntimeSetting("YACY_RESOURCE").then((value) => value ?? "global"),
      getRuntimeSetting("YACY_USERNAME"),
      getRuntimeSetting("YACY_PASSWORD"),
      getRuntimeSetting("SEARXNG_BASE_URL").then(
        (value) => value ?? "http://localhost:8888",
      ),
      getRuntimeSetting("SEARXNG_USERNAME"),
      getRuntimeSetting("SEARXNG_PASSWORD"),
    ]);
  } catch {
    throw new SearchConfigurationError(
      "Search configuration could not be loaded.",
    );
  }

  selection = selection.toLowerCase();

  if (selection === "mock") {
    if (process.env.E2E_MOCK_SEARCH !== "true") {
      throw new SearchConfigurationError(
        "Mock search provider is disabled outside automated tests.",
      );
    }
    return [mockProvider()];
  }

  const normalizedResource = yacyResource.toLowerCase();
  if (normalizedResource !== "local" && normalizedResource !== "global") {
    throw new SearchConfigurationError(
      "YACY_RESOURCE must be local or global.",
    );
  }

  const yacy = yacyProvider({
    baseUrl: yacyBaseUrl,
    resource: normalizedResource,
    username: yacyUsername,
    password: yacyPassword,
  });

  const searxng = searxngProvider({
    baseUrl: searxngBaseUrl,
    username: searxngUsername,
    password: searxngPassword,
  });

  if (selection === "auto") return [searxng, yacy];
  if (selection === "searxng") return [searxng];
  if (selection === "yacy") return [yacy];

  throw new SearchConfigurationError(
    "SEARCH_PROVIDER must be auto, searxng, yacy (or mock in automated tests).",
  );
}

function dedupeProviderResults(
  results: ProviderSearchResult[],
): ProviderSearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    let key = result.url;
    try {
      const url = new URL(result.url);
      url.hash = "";
      key = url.toString().replace(/\/$/, "").toLowerCase();
    } catch {
      key = result.url.toLowerCase();
    }
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchQuery(
  query: string,
  signal: AbortSignal,
): Promise<{
  providers: string[];
  results: ProviderSearchResult[];
  warnings: string[];
}> {
  const providers = await configuredProviders();
  const warnings: string[] = [];

  const outcomes: Array<{
    provider: string;
    results: ProviderSearchResult[];
  }> = [];

  for (const provider of providers) {
    try {
      const results = await provider.search(query, signal);
      outcomes.push({ provider: provider.name, results });

      // In auto mode SearXNG is the broad-discovery source. If it already
      // returned a healthy result set, avoid doubling the upstream work.
      if (
        providers.length > 1 &&
        provider.name === "searxng" &&
        results.length >= 5
      ) {
        break;
      }
    } catch (error) {
      if (signal.aborted) throw error;
      warnings.push(
        `${provider.name} failed for one query: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
      outcomes.push({ provider: provider.name, results: [] });
    }
  }

  const successfulProviders = outcomes
    .filter((outcome) => outcome.results.length > 0)
    .map((outcome) => outcome.provider);
  const results = dedupeProviderResults(
    outcomes.flatMap((outcome) => outcome.results),
  );

  if (results.length === 0 && warnings.length > 0) {
    throw new Error(
      warnings.join(" ") || "All configured search providers failed.",
    );
  }

  return {
    providers: successfulProviders,
    results,
    warnings,
  };
}
