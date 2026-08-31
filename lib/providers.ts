import { getRuntimeSetting } from "@/lib/runtime-config";

export interface ProviderSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string | null;
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
  let endpoint: URL;
  try {
    const base = config.baseUrl.endsWith("/") ? config.baseUrl : `${config.baseUrl}/`;
    endpoint = new URL("yacysearch.json", base);
  } catch {
    throw new SearchConfigurationError("YACY_BASE_URL must be a valid http(s) URL.");
  }

  if (!["http:", "https:"].includes(endpoint.protocol)) {
    throw new SearchConfigurationError("YACY_BASE_URL must use http or https.");
  }

  return {
    name: "yacy",
    async search(query, signal) {
      const url = new URL(endpoint);
      url.searchParams.set("query", query);
      url.searchParams.set("resource", config.resource);
      url.searchParams.set("contentdom", "text");
      url.searchParams.set("maximumRecords", "10");
      url.searchParams.set("verify", "false");
      url.searchParams.set("nav", "none");

      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      if (config.username && config.password) {
        headers.Authorization = `Basic ${Buffer.from(
          `${config.username}:${config.password}`,
          "utf8",
        ).toString("base64")}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
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
        }];
      }

      if (lower.includes("complaint") || lower.includes("allegation") || lower.includes("fraud")) {
        return [{
          title: `Example news mention — ${subject}`,
          url: `https://news.example.org/${slug}`,
          snippet: `${subject} in Zurich. Example-only news fixture used for automated testing. The presence of this result is not a real allegation.`,
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
        }];
      }

      return [
        {
          title: `${subject} — Professional profile`,
          url: `https://www.linkedin.com/in/${slug}`,
          snippet: `${subject}, data professional in Zurich at ${company}.`,
        },
        {
          title: `${slug} · GitHub`,
          url: `https://github.com/${slug}`,
          snippet: `Public projects by ${subject}. ${company} and Zurich are mentioned in the profile.`,
        },
        {
          title: `${subject} — Example conference`,
          url: `https://conference.example.org/speakers/${slug}`,
          snippet: `Speaker biography for ${subject}, based in Zurich.`,
        },
      ];
    },
  };
}

async function configuredProviders(): Promise<SearchProvider[]> {
  let selection: string;
  let baseUrl: string;
  let resource: string;
  let username: string | undefined;
  let password: string | undefined;

  try {
    [selection, baseUrl, resource, username, password] = await Promise.all([
      getRuntimeSetting("SEARCH_PROVIDER").then((value) => value ?? "yacy"),
      getRuntimeSetting("YACY_BASE_URL").then(
        (value) => value ?? "http://localhost:8090",
      ),
      getRuntimeSetting("YACY_RESOURCE").then((value) => value ?? "global"),
      getRuntimeSetting("YACY_USERNAME"),
      getRuntimeSetting("YACY_PASSWORD"),
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

  if (selection !== "yacy") {
    throw new SearchConfigurationError(
      "SEARCH_PROVIDER must be yacy (or mock in automated tests).",
    );
  }

  const normalizedResource = resource.toLowerCase();
  if (normalizedResource !== "local" && normalizedResource !== "global") {
    throw new SearchConfigurationError(
      "YACY_RESOURCE must be local or global.",
    );
  }

  if (Boolean(username) !== Boolean(password)) {
    throw new SearchConfigurationError(
      "Configure both YACY_USERNAME and YACY_PASSWORD, or neither.",
    );
  }

  return [
    yacyProvider({
      baseUrl,
      resource: normalizedResource,
      username,
      password,
    }),
  ];
}

export async function searchQuery(
  query: string,
  signal: AbortSignal,
): Promise<{
  provider: string;
  results: ProviderSearchResult[];
  warnings: string[];
}> {
  const providers = await configuredProviders();
  const warnings: string[] = [];

  for (const provider of providers) {
    try {
      const results = await provider.search(query, signal);
      return { provider: provider.name, results, warnings };
    } catch (error) {
      if (signal.aborted) throw error;
      warnings.push(
        `${provider.name} failed for one query: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }

  throw new Error(
    warnings.join(" ") || "All configured search providers failed.",
  );
}
