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
  it("creates a high-confidence context match from corroborating profiles", () => {
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
    expect(candidates[0]?.label).toContain("context match");
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
