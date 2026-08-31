import { describe, expect, it } from "vitest";

import { netflixIdentityBenchmarkCases } from "@/benchmarks/netflix-identity-cases";
import { buildIdentityCandidates } from "@/lib/identity";
import { buildIdentityQueries } from "@/lib/queries";
import type { SearchInput, SearchResult } from "@/types/search";

function slug(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nearName(name: string): string {
  const parts = name.split(/\s+/);
  const last = parts.pop() ?? "person";
  return [...parts, `${last}x`].join(" ");
}

function searchResult(
  title: string,
  url: string,
  snippet: string,
  sourceType: SearchResult["sourceType"] = "web",
): SearchResult {
  return {
    title,
    url,
    snippet,
    sourceType,
    publishedAt: null,
    providers: ["netflix-benchmark"],
    queries: [],
    queryKinds: ["identity"],
  };
}

describe("Netflix exact-identity release benchmark", () => {
  it("contains at least 20 unique adult documentary-subject names from the last 10 years", () => {
    expect(netflixIdentityBenchmarkCases.length).toBeGreaterThanOrEqual(20);

    const names = netflixIdentityBenchmarkCases.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);

    for (const entry of netflixIdentityBenchmarkCases) {
      expect(entry.year).toBeGreaterThanOrEqual(2016);
      expect(entry.year).toBeLessThanOrEqual(2026);
      expect(entry.name.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);
      expect(entry.netflixUrl).toMatch(/^https:\/\/(?:www\.|media\.)?netflix\.com\//);
    }
  });

  for (const benchmark of netflixIdentityBenchmarkCases) {
    it(`finds the exact identity for ${benchmark.name} and rejects similar names`, () => {
      const similar = nearName(benchmark.name);
      const firstName = benchmark.name.split(/\s+/)[0] ?? "Person";

      const correct = searchResult(
        benchmark.documentary,
        benchmark.netflixUrl,
        `Netflix identifies ${benchmark.name} as a person featured in ${benchmark.documentary}.`,
      );

      const noisyResults: SearchResult[] = [
        searchResult(
          `${similar} | LinkedIn`,
          `https://www.linkedin.com/in/${slug(similar)}`,
          `${similar} public professional profile.`,
          "professional",
        ),
        searchResult(
          `${firstName} Different-Surname | Instagram`,
          `https://www.instagram.com/${slug(firstName)}-different-surname/`,
          `${firstName} Different-Surname public social profile.`,
          "social",
        ),
        searchResult(
          `Profile for ${similar}`,
          `https://example.org/${slug(similar)}`,
          `${similar} appears in an unrelated page.`,
        ),
        correct,
      ];

      const candidates = buildIdentityCandidates(noisyResults, {
        name: benchmark.name,
      });

      expect(candidates).toHaveLength(1);
      expect(candidates[0]?.searchName).toBe(benchmark.name);
      expect(candidates[0]?.label).toContain(benchmark.name);
      expect(candidates[0]?.sources.map((source) => source.url)).toContain(
        benchmark.netflixUrl,
      );
      expect(
        candidates[0]?.sources.some((source) => source.url.includes(slug(similar))),
      ).toBe(false);
    });

    it(`keeps every discovery query exact for ${benchmark.name}`, () => {
      const input: SearchInput = {
        name: benchmark.name,
        mode: "identity",
        lawfulUseAccepted: true,
      };

      const queries = buildIdentityQueries(input);
      expect(queries.length).toBeGreaterThan(0);

      for (const query of queries) {
        expect(query.text).toContain(`"${benchmark.name}"`);
      }
    });
  }
});
