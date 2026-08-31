import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchConfigurationError, searchQuery } from "@/lib/providers";

const originalEnvironment = {
  SEARCH_PROVIDER: process.env.SEARCH_PROVIDER,
  SEARXNG_BASE_URL: process.env.SEARXNG_BASE_URL,
  SEARXNG_USERNAME: process.env.SEARXNG_USERNAME,
  SEARXNG_PASSWORD: process.env.SEARXNG_PASSWORD,
  YACY_BASE_URL: process.env.YACY_BASE_URL,
  YACY_RESOURCE: process.env.YACY_RESOURCE,
  YACY_USERNAME: process.env.YACY_USERNAME,
  YACY_PASSWORD: process.env.YACY_PASSWORD,
  E2E_MOCK_SEARCH: process.env.E2E_MOCK_SEARCH,
};

function restoreEnvironment(
  key: keyof typeof originalEnvironment,
): void {
  const value = originalEnvironment[key];
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of Object.keys(originalEnvironment) as Array<
    keyof typeof originalEnvironment
  >) {
    restoreEnvironment(key);
  }
});

describe("search providers", () => {
  it("normalizes YaCy JSON results and uses the configured search mode", async () => {
    process.env.SEARCH_PROVIDER = "yacy";
    process.env.YACY_BASE_URL = "http://localhost:8090";
    process.env.YACY_RESOURCE = "global";

    const mockedFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          channels: [
            {
              items: [
                {
                  title: "<b>Jane</b> Example",
                  link: "https://example.org/jane",
                  description: "Public <b>profile</b> &amp; biography",
                  pubDate: "Mon, 31 Aug 2026 10:00:00 +0200",
                },
              ],
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", mockedFetch);

    const response = await searchQuery(
      '"Jane Unique-Surname"',
      new AbortController().signal,
    );

    expect(response.providers).toEqual(["yacy"]);
    expect(response.results[0]).toMatchObject({
      title: "Jane Example",
      url: "https://example.org/jane",
      snippet: "Public profile & biography",
      publishedAt: "Mon, 31 Aug 2026 10:00:00 +0200",
      provider: "yacy",
    });

    const requested = new URL(String(mockedFetch.mock.calls[0]?.[0]));
    expect(requested.pathname).toBe("/yacysearch.json");
    expect(requested.searchParams.get("resource")).toBe("global");
    expect(requested.searchParams.get("maximumRecords")).toBe("10");
  });

  it("uses SearXNG JSON results for broad discovery", async () => {
    process.env.SEARCH_PROVIDER = "searxng";
    process.env.SEARXNG_BASE_URL = "http://localhost:8888";

    const mockedFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              title: "Jane Example",
              url: "https://example.net/jane",
              content: "Public profile in Zurich",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", mockedFetch);

    const response = await searchQuery(
      '"Jane Example" Zurich',
      new AbortController().signal,
    );

    expect(response.providers).toEqual(["searxng"]);
    expect(response.results[0]).toMatchObject({
      title: "Jane Example",
      url: "https://example.net/jane",
      snippet: "Public profile in Zurich",
      provider: "searxng",
    });

    const requested = new URL(String(mockedFetch.mock.calls[0]?.[0]));
    expect(requested.pathname).toBe("/search");
    expect(requested.searchParams.get("format")).toBe("json");
    expect(requested.searchParams.get("categories")).toBe(
      "general,social media",
    );
  });

  it("supplements sparse SearXNG results with YaCy in auto mode", async () => {
    process.env.SEARCH_PROVIDER = "auto";
    process.env.SEARXNG_BASE_URL = "http://localhost:8888";
    process.env.YACY_BASE_URL = "http://localhost:8090";

    const mockedFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [{
              title: "Jane Example",
              url: "https://example.net/jane",
              content: "One broad-search result",
            }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            channels: [{
              items: [{
                title: "Jane Example on another site",
                link: "https://example.org/jane",
                description: "YaCy result",
              }],
            }],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", mockedFetch);

    const response = await searchQuery(
      '"Jane Example"',
      new AbortController().signal,
    );

    expect(response.providers).toEqual(["searxng", "yacy"]);
    expect(response.results).toHaveLength(2);
  });

  it("supports optional basic authentication for a protected YaCy node", async () => {
    process.env.SEARCH_PROVIDER = "yacy";
    process.env.YACY_BASE_URL = "https://search.example.org";
    process.env.YACY_USERNAME = "search-user";
    process.env.YACY_PASSWORD = "secret";

    const mockedFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ channels: [{ items: [] }] }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", mockedFetch);

    await searchQuery('"Jane"', new AbortController().signal);

    const options = mockedFetch.mock.calls[0]?.[1] as RequestInit;
    expect((options.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from("search-user:secret").toString("base64")}`,
    );
  });

  it("rejects invalid YaCy resource configuration", async () => {
    process.env.SEARCH_PROVIDER = "yacy";
    process.env.YACY_RESOURCE = "internet";

    await expect(
      searchQuery('"Jane"', new AbortController().signal),
    ).rejects.toBeInstanceOf(SearchConfigurationError);
  });

  it("allows the mock provider only when explicitly enabled", async () => {
    process.env.SEARCH_PROVIDER = "mock";
    process.env.E2E_MOCK_SEARCH = "true";

    const response = await searchQuery(
      '"Jane Unique-Surname"',
      new AbortController().signal,
    );

    expect(response.providers).toEqual(["mock"]);
    expect(response.results.length).toBeGreaterThan(0);
  });
});
