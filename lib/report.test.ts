import { describe, expect, it } from "vitest";

import { buildReportSections, claimAssessment } from "@/lib/report";
import type { SearchResult } from "@/types/search";

const base: SearchResult = {
  title: "Jane",
  url: "https://example.org/jane",
  snippet: "Example",
  sourceType: "web",
  publishedAt: null,
  providers: ["test"],
  queries: ['"Jane"'],
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
});
