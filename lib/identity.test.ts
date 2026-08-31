import { describe, expect, it } from "vitest";

import { buildIdentityCandidates } from "@/lib/identity";
import type { SearchResult } from "@/types/search";

function result(
  overrides: Partial<SearchResult> & Pick<SearchResult, "title" | "url">,
): SearchResult {
  const { title, url, ...rest } = overrides;
  return {
    snippet: "",
    sourceType: "web",
    publishedAt: null,
    providers: ["test"],
    queries: ['"Jane Unique-Surname"'],
    queryKinds: ["identity"],
    ...rest,
    title,
    url,
  };
}

describe("identity candidate building", () => {
  it("creates a high-confidence candidate from corroborating profiles", () => {
    const candidates = buildIdentityCandidates(
      [
        result({
          title: "Jane Unique-Surname | LinkedIn",
          url: "https://linkedin.com/in/jane",
          snippet: "Data professional at Example AG in Zurich",
          sourceType: "professional",
        }),
        result({
          title: "Jane Unique-Surname · GitHub",
          url: "https://github.com/jane",
          snippet: "Zurich. Example AG. Public software projects.",
          sourceType: "professional",
        }),
        result({
          title: "Another Jane Unique-Surname",
          url: "https://example.net/other",
          snippet: "Photographer in Toronto",
        }),
      ],
      {
        name: "Jane Unique-Surname",
        location: "Zurich",
        company: "Example AG",
      },
    );

    expect(candidates[0]?.confidence).toBe("high");
    expect(candidates[0]?.sources.length).toBeGreaterThanOrEqual(2);
  });

  it("uses a known social handle as an explainable matching signal", () => {
    const candidates = buildIdentityCandidates(
      [
        result({
          title: "Jane Unique-Surname on Instagram",
          url: "https://instagram.com/janeunique",
          snippet: "Zurich profile for @janeunique",
          sourceType: "social",
        }),
      ],
      { name: "Jane Unique-Surname", socialProfiles: ["@janeunique"] },
    );
    expect(candidates[0]?.supportingSignals).toContain(
      "Known social profile or handle matches",
    );
  });

  it("keeps two namesakes as separate selectable candidates", () => {
    const candidates = buildIdentityCandidates(
      [
        result({
          title: "Alex Morgan | LinkedIn",
          url: "https://linkedin.com/in/alex-morgan-zurich",
          snippet: "Engineer in Zurich at Alpha AG",
          sourceType: "professional",
        }),
        result({
          title: "Alex Morgan | LinkedIn",
          url: "https://linkedin.com/in/alex-morgan-london",
          snippet: "Designer in London at Beta Ltd",
          sourceType: "professional",
        }),
      ],
      { name: "Alex Morgan" },
    );

    expect(candidates).toHaveLength(2);
    expect(candidates[0]?.id).not.toBe(candidates[1]?.id);
  });

  it("rejects unrelated generic pages when supplied context does not match", () => {
    const candidates = buildIdentityCandidates(
      [
        result({
          title: "Someone else's personal website",
          url: "https://unrelated.example/about",
          snippet: "Portfolio by a different person in Zurich",
          sourceType: "web",
        }),
        result({
          title: "Alex Morgan | LinkedIn",
          url: "https://linkedin.com/in/alex-morgan",
          snippet: "Alex Morgan, engineer at Alpha AG in Zurich",
          sourceType: "professional",
        }),
      ],
      {
        name: "Alex Morgan",
        location: "Zurich",
        company: "Alpha AG",
      },
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.sources.map((source) => source.url)).toEqual([
      "https://linkedin.com/in/alex-morgan",
    ]);
  });

  it("does not substitute a similar or related name for the searched full name", () => {
    const candidates = buildIdentityCandidates(
      [
        result({
          title: "The Puppet Master: Hunting the Ultimate Conman",
          url: "https://www.netflix.com/title/example",
          snippet:
            "The documentary tells the story of Robert Hendy-Freegard, also known as Robert Freegard.",
          sourceType: "web",
        }),
      ],
      { name: "Robert Conman" },
    );

    expect(candidates).toEqual([]);
  });

  it("shows neutral low-confidence possibilities when no strong match survives", () => {
    const candidates = buildIdentityCandidates(
      [
        result({
          title: "Professional profile",
          url: "https://linkedin.com/in/sasza-swiatek",
          snippet: "Sasza Swiatek public professional profile",
          sourceType: "professional",
        }),
        result({
          title: "Sasza Swiatek",
          url: "https://example.org/sasza",
          snippet: "Public profile page",
          sourceType: "web",
        }),
      ],
      {
        name: "Sasza Swiatek",
        location: "Zurich",
        company: "UBS",
      },
    );

    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((candidate) => candidate.confidence === "low")).toBe(
      true,
    );
    expect(candidates[0]?.supportingSignals.join(" ")).toMatch(
      /exact full name/i,
    );
  });

  it("uses a neutral social/profile URL slug as low-confidence name evidence", () => {
    const candidates = buildIdentityCandidates(
      [
        result({
          title: "LinkedIn",
          url: "https://www.linkedin.com/in/sasza-swiatek",
          snippet: "Public professional profile",
          sourceType: "professional",
        }),
      ],
      {
        name: "Sasza Swiatek",
        location: "Zurich",
        company: "UBS",
      },
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.confidence).toBe("low");
    expect(candidates[0]?.sources[0]?.url).toContain(
      "linkedin.com/in/sasza-swiatek",
    );
    expect(candidates[0]?.supportingSignals.join(" ")).toMatch(
      /profile URL/i,
    );
  });

  it("rejects similar surnames even when location and employer match", () => {
    const candidates = buildIdentityCandidates(
      [
        result({
          title: "Sasza Swiatecki | LinkedIn",
          url: "https://linkedin.com/in/sasza-swiatecki",
          snippet: "Engineer at UBS in Zurich",
          sourceType: "professional",
        }),
      ],
      {
        name: "Sasza Swiatek",
        location: "Zurich",
        company: "UBS",
      },
    );

    expect(candidates).toEqual([]);
  });

  it("does not require a candidate when there are no results", () => {
    expect(
      buildIdentityCandidates([], { name: "Jane Unique-Surname" }),
    ).toEqual([]);
  });

  it("surfaces separate anchors when no identifying context exists", () => {
    const candidates = buildIdentityCandidates(
      [
        result({
          title: "Jane Unique-Surname | LinkedIn",
          url: "https://linkedin.com/in/jane-one",
          sourceType: "professional",
        }),
        result({
          title: "Jane Unique-Surname | Instagram",
          url: "https://instagram.com/jane-two",
          sourceType: "social",
        }),
      ],
      { name: "Jane Unique-Surname" },
    );

    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates.every((candidate) => candidate.sources.length >= 1)).toBe(
      true,
    );
  });
});
