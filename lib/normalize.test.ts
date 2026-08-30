import { describe, expect, it } from "vitest";

import {
  categorizeSource,
  dedupeResults,
  normalizeUrl,
} from "@/lib/normalize";

describe("result normalization", () => {
  it("strips tracking parameters and fragments", () => {
    expect(
      normalizeUrl(
        "https://example.org/person/?utm_source=test&b=2&a=1#profile",
      ),
    ).toBe("https://example.org/person?a=1&b=2");
  });

  it("classifies common source types", () => {
    expect(categorizeSource("https://www.linkedin.com/in/jane")).toBe(
      "professional",
    );
    expect(categorizeSource("https://justice.gov/example")).toBe("official");
    expect(categorizeSource("https://www.reuters.com/world/example")).toBe(
      "news",
    );
  });

  it("merges duplicate URLs while preserving provenance", () => {
    const results = dedupeResults([
      {
        title: "Jane",
        url: "https://example.org/jane?utm_source=a",
        snippet: "Short",
        provider: "tavily",
        query: '"Jane"',
        queryKind: "identity",
      },
      {
        title: "Jane profile",
        url: "https://example.org/jane",
        snippet: "A longer snippet about Jane Unique-Surname.",
        provider: "brave",
        query: '"Jane" news',
        queryKind: "news",
      },
    ]);

    expect(results).toHaveLength(1);
    expect(results[0]?.providers).toEqual(["tavily", "brave"]);
    expect(results[0]?.queryKinds).toEqual(["identity", "news"]);
    expect(results[0]?.snippet).toContain("longer snippet");
  });
});
