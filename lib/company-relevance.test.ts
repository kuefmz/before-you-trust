import { describe, expect, it } from "vitest";

import { rankCompanyResults } from "@/lib/company-relevance";
import type { SearchInput, SearchResult } from "@/types/search";

const input: SearchInput = {
  name: "Erth Labs",
  subjectType: "company",
  profileUrl: "https://erthlabs.co",
  location: "United States",
  mode: "deep",
  lawfulUseAccepted: true,
  confirmedIdentity: {
    label: "Erth Labs",
    searchName: "Erth Labs",
    confidence: "high",
    supportingSignals: ["Website supplied by the user"],
    urls: ["https://erthlabs.co"],
  },
};

function result(
  title: string,
  url: string,
  snippet: string,
): SearchResult {
  return {
    title,
    url,
    snippet,
    sourceType: "web",
    publishedAt: null,
    providers: ["searxng"],
    queries: ['"Erth Labs" reviews'],
    queryKinds: ["general"],
  };
}

describe("company relevance filtering", () => {
  it("keeps exact-domain and exact-company findings", () => {
    const ranked = rankCompanyResults(
      [
        result(
          "Collections – Erth Labs",
          "https://erthlabs.co/collections",
          "High-quality ingredients from Erth Labs.",
        ),
        result(
          "Erth Labs - YouTube",
          "https://youtube.com/@erthlabs",
          "Official Erth Labs videos.",
        ),
        result(
          "Erth Labs registry record",
          "https://registry.example/company/123",
          "Registered company: Erth Labs",
        ),
      ],
      input,
    );

    expect(ranked).toHaveLength(3);
    expect(ranked[0]?.url).toContain("erthlabs.co");
  });

  it("rejects fuzzy and unrelated results returned by the search engine", () => {
    const ranked = rankCompanyResults(
      [
        result(
          "Earthly Technologies",
          "https://earthly.dev",
          "Build automation for developers.",
        ),
        result(
          "The EU formally launches a bidding process to develop AI Gigafactories",
          "https://techhub.social/posts/123",
          "European AI infrastructure news.",
        ),
        result(
          "Krimi um EU-Votum",
          "https://frawas.de/news/123",
          "Unrelated European news.",
        ),
        result(
          "Light rail in Portland normally moves at a sedate pace downtown",
          "https://mastodon.social/@example/123",
          "A public transport discussion.",
        ),
      ],
      input,
    );

    expect(ranked).toEqual([]);
  });

  it("can match a domain even when the company name was entered as the domain", () => {
    const domainInput: SearchInput = {
      ...input,
      name: "erthlabs.co",
    };

    const ranked = rankCompanyResults(
      [
        result(
          "Customer discussion about erthlabs.co",
          "https://forum.example/thread/erthlabs-co",
          "Has anyone ordered from erthlabs.co?",
        ),
        result(
          "Earth Labs research",
          "https://unrelated.example/earth-labs",
          "A different organization.",
        ),
      ],
      domainInput,
    );

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.url).toContain("forum.example");
  });
});
