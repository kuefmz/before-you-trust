import { afterEach, describe, expect, it, vi } from "vitest";

import { searchQuery } from "@/lib/providers";

const originalEnvironment = {
  SEARCH_PROVIDER: process.env.SEARCH_PROVIDER,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
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
  restoreEnvironment("SEARCH_PROVIDER");
  restoreEnvironment("TAVILY_API_KEY");
  restoreEnvironment("BRAVE_SEARCH_API_KEY");
  restoreEnvironment("E2E_MOCK_SEARCH");
});

describe("search providers", () => {
  it("normalizes Tavily results", async () => {
    process.env.SEARCH_PROVIDER = "tavily";
    process.env.TAVILY_API_KEY = "test-key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            results: [
              {
                title: "Jane",
                url: "https://example.org/jane",
                content: "Public profile",
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const response = await searchQuery(
      '"Jane Unique-Surname"',
      new AbortController().signal,
    );

    expect(response.provider).toBe("tavily");
    expect(response.results[0]).toMatchObject({
      title: "Jane",
      url: "https://example.org/jane",
      snippet: "Public profile",
    });
  });

  it("falls back to Brave in auto mode when Tavily fails", async () => {
    process.env.SEARCH_PROVIDER = "auto";
    process.env.TAVILY_API_KEY = "tavily";
    process.env.BRAVE_SEARCH_API_KEY = "brave";

    const mockedFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("no", { status: 500 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            web: {
              results: [
                {
                  title: "Jane",
                  url: "https://example.org/jane",
                  description: "Brave result",
                },
              ],
            },
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", mockedFetch);

    const response = await searchQuery(
      '"Jane Unique-Surname"',
      new AbortController().signal,
    );

    expect(response.provider).toBe("brave");
    expect(response.warnings[0]).toContain("tavily failed");
    expect(response.results[0]?.snippet).toBe("Brave result");
  });

  it("allows the mock provider only when explicitly enabled", async () => {
    process.env.SEARCH_PROVIDER = "mock";
    process.env.E2E_MOCK_SEARCH = "true";

    const response = await searchQuery(
      '"Jane Unique-Surname"',
      new AbortController().signal,
    );

    expect(response.provider).toBe("mock");
    expect(response.results.length).toBeGreaterThan(0);
  });
});
