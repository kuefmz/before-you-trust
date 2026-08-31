import { describe, expect, it } from "vitest";

import {
  buildReportSections,
  claimAssessment,
  filterResultsForConfirmedIdentity,
} from "@/lib/report";
import type { SearchResult } from "@/types/search";

const base: SearchResult = {
  title: "Jane Unique-Surname",
  url: "https://example.org/jane",
  snippet: "Jane Unique-Surname in Zurich at Example AG",
  sourceType: "web",
  publishedAt: null,
  providers: ["test"],
  queries: ['"Jane Unique-Surname"'],
  queryKinds: ["identity"],
};

describe("Trust Brief grouping", () => {
  it("separates concern-query results with explicit context", () => {
    const sections = buildReportSections([
      base,
      {
        ...base,
        url: "https://example.org/concern",
        queryKinds: ["concern"],
      },
    ]);

    expect(sections.find((section) => section.id === "concern")?.title).toBe(
      "Needs closer review",
    );
  });

  it("does not automatically call a claim verified", () => {
    const assessment = claimAssessment([
      {
        ...base,
        queryKinds: ["claim"],
        sourceType: "official",
      },
    ]);

    expect(assessment?.label).toBe("Official source found");
    expect(assessment?.detail).toContain("before treating the claim as verified");
  });

  it("states uncertainty when a claim has no search result", () => {
    expect(claimAssessment([base])?.label).toBe(
      "Not corroborated by this search",
    );
  });

  it("drops wrong-person concern results even when the search query returned them", () => {
    const selected: SearchResult = {
      ...base,
      sourceType: "professional",
      url: "https://linkedin.com/in/jane-unique",
    };
    const wrongPerson: SearchResult = {
      ...base,
      title: "Jane Unique-Surname",
      url: "https://news.example.org/other-jane",
      snippet: "Jane Unique-Surname in Toronto at Other Corp",
      sourceType: "news",
      queryKinds: ["concern"],
    };
    const correctPerson: SearchResult = {
      ...base,
      title: "Jane Unique-Surname investigated by regulator",
      url: "https://news.example.org/zurich-jane",
      snippet: "Jane Unique-Surname of Zurich and Example AG",
      sourceType: "news",
      queryKinds: ["concern"],
    };

    const filtered = filterResultsForConfirmedIdentity(
      [wrongPerson, correctPerson],
      [selected],
      {
        name: "Jane Unique-Surname",
        location: "Zurich",
        company: "Example AG",
      },
    );

    expect(filtered.results).toEqual([correctPerson]);
    expect(filtered.excludedCount).toBe(1);
  });

  it("excludes a similar-name result even when city and employer match", () => {
    const similarName: SearchResult = {
      ...base,
      title: "Jane Unique-Surnames | UBS",
      url: "https://example.org/jane-similar",
      snippet: "Jane Unique-Surnames in Zurich at Example AG",
      sourceType: "professional",
      queryKinds: ["professional"],
    };

    const filtered = filterResultsForConfirmedIdentity(
      [similarName],
      [],
      {
        name: "Jane Unique-Surname",
        location: "Zurich",
        company: "Example AG",
      },
    );

    expect(filtered.results).toEqual([]);
    expect(filtered.excludedCount).toBe(1);
  });

  it("always keeps the sources explicitly selected with the confirmed candidate", () => {
    const selected: SearchResult = {
      ...base,
      title: "Profile with a shortened display name",
      snippet: "Confirmed profile",
      url: "https://github.com/janeunique",
      sourceType: "professional",
    };

    const filtered = filterResultsForConfirmedIdentity(
      [selected],
      [selected],
      {
        name: "Jane Unique-Surname",
        location: "Zurich",
      },
    );

    expect(filtered.results).toEqual([selected]);
    expect(filtered.excludedCount).toBe(0);
  });
});
