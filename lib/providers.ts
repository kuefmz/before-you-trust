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

export class SearchConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchConfigurationError";
  }
}

function tavilyProvider(apiKey: string): SearchProvider {
  return {
    name: "tavily",
    async search(query, signal) {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "basic",
          include_answer: false,
          include_raw_content: false,
          max_results: 6,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`Tavily request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as {
        results?: Array<{
          title?: string;
          url?: string;
          content?: string;
          published_date?: string | null;
        }>;
      };

      return (payload.results ?? [])
        .filter((item) => item.url)
        .map((item) => ({
          title: item.title ?? item.url ?? "Untitled result",
          url: item.url!,
          snippet: item.content ?? "",
          publishedAt: item.published_date ?? null,
        }));
    },
  };
}

function braveProvider(apiKey: string): SearchProvider {
  return {
    name: "brave",
    async search(query, signal) {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", query);
      url.searchParams.set("count", "6");
      url.searchParams.set("safesearch", "moderate");

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(`Brave request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as {
        web?: {
          results?: Array<{
            title?: string;
            url?: string;
            description?: string;
            page_age?: string | null;
          }>;
        };
      };

      return (payload.web?.results ?? [])
        .filter((item) => item.url)
        .map((item) => ({
          title: item.title ?? item.url ?? "Untitled result",
          url: item.url!,
          snippet: item.description ?? "",
          publishedAt: item.page_age ?? null,
        }));
    },
  };
}

function mockProvider(): SearchProvider {
  return {
    name: "mock",
    async search(query) {
      const lower = query.toLowerCase();

      if (lower.includes("court") || lower.includes("regulator")) {
        return [
          {
            title: "Example public registry result — Jane Unique-Surname",
            url: "https://registry.example.org/jane-unique-surname",
            snippet:
              "Example-only registry fixture used for automated testing. No real person is represented.",
          },
        ];
      }

      if (lower.includes("complaint") || lower.includes("allegation")) {
        return [
          {
            title: "Example news mention — Jane Unique-Surname",
            url: "https://news.example.org/jane-unique-surname",
            snippet:
              "Example-only news fixture used for automated testing. The presence of this result is not a real allegation.",
          },
        ];
      }

      return [
        {
          title: "Jane Unique-Surname — Professional profile",
          url: "https://www.linkedin.com/in/jane-unique-surname",
          snippet:
            "Jane Unique-Surname, data professional in Zurich at Example AG.",
        },
        {
          title: "jane-unique-surname · GitHub",
          url: "https://github.com/jane-unique-surname",
          snippet:
            "Public projects by Jane Unique-Surname. Example AG and Zurich are mentioned in the profile.",
        },
        {
          title: "Jane Unique-Surname — Example conference",
          url: "https://conference.example.org/speakers/jane-unique-surname",
          snippet:
            "Speaker biography for Jane Unique-Surname, based in Zurich.",
        },
      ];
    },
  };
}

function configuredProviders(): SearchProvider[] {
  const selection = (process.env.SEARCH_PROVIDER ?? "auto").toLowerCase();
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();
  const braveKey = process.env.BRAVE_SEARCH_API_KEY?.trim();

  if (selection === "mock") {
    if (process.env.E2E_MOCK_SEARCH !== "true") {
      throw new SearchConfigurationError(
        "Mock search provider is disabled outside automated tests.",
      );
    }
    return [mockProvider()];
  }

  if (selection === "tavily") {
    if (!tavilyKey) {
      throw new SearchConfigurationError("TAVILY_API_KEY is not configured.");
    }
    return [tavilyProvider(tavilyKey)];
  }

  if (selection === "brave") {
    if (!braveKey) {
      throw new SearchConfigurationError(
        "BRAVE_SEARCH_API_KEY is not configured.",
      );
    }
    return [braveProvider(braveKey)];
  }

  if (selection !== "auto") {
    throw new SearchConfigurationError(
      "SEARCH_PROVIDER must be auto, tavily, or brave.",
    );
  }

  const providers: SearchProvider[] = [];
  if (tavilyKey) providers.push(tavilyProvider(tavilyKey));
  if (braveKey) providers.push(braveProvider(braveKey));

  if (providers.length === 0) {
    throw new SearchConfigurationError(
      "No search provider is configured. Add TAVILY_API_KEY or BRAVE_SEARCH_API_KEY.",
    );
  }

  return providers;
}

export async function searchQuery(
  query: string,
  signal: AbortSignal,
): Promise<{
  provider: string;
  results: ProviderSearchResult[];
  warnings: string[];
}> {
  const providers = configuredProviders();
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

  throw new Error(warnings.join(" ") || "All configured search providers failed.");
}
