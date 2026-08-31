import { describe, expect, it } from "vitest";

import { buildDeepQueries, buildIdentityQueries } from "@/lib/queries";
import type { SearchInput } from "@/types/search";

const base: SearchInput = {
  name: "Jane Unique-Surname",
  location: "Zurich, Switzerland",
  company: "Example AG",
  profileUrl: "https://example.org/jane",
  mode: "identity",
  lawfulUseAccepted: true,
};

describe("query generation", () => {
  it("keeps the identity stage neutral", () => {
    const queries = buildIdentityQueries(base).map((query) => query.text);

    expect(queries.some((query) => query.toLowerCase().includes("linkedin.com"))).toBe(true);
    expect(queries.some((query) => /fraud|scam|lawsuit/i.test(query))).toBe(false);
    expect(queries.some((query) => query.includes("site:example.org"))).toBe(true);
    expect(queries.some((query) => /\sOR\s/i.test(query))).toBe(false);
  });

  it("keeps exact-name discovery bounded to avoid overwhelming metasearch engines", () => {
    const queries = buildIdentityQueries(base);
    expect(queries.length).toBeLessThanOrEqual(16);
    expect(
      queries.every((query) => query.text.includes('"Jane Unique-Surname"')),
    ).toBe(true);
  });

  it("searches major social platforms in the identity stage", () => {
    const social = buildIdentityQueries({
      ...base,
      socialProfiles: ["@janeunique", "https://instagram.com/janeunique"],
    });
    expect(social.some((query) => query.kind === "social")).toBe(true);
    expect(social.some((query) => query.text.includes("instagram.com"))).toBe(true);
    expect(social.some((query) => query.text.includes("tiktok.com"))).toBe(true);
    expect(social.some((query) => query.text.includes("facebook.com"))).toBe(true);
    expect(social.some((query) => query.text.includes("x.com"))).toBe(true);
    expect(social.some((query) => query.text.includes("youtube.com"))).toBe(true);
  });

  it("prioritizes user-supplied social clues before generic platforms", () => {
    const social = buildIdentityQueries({
      ...base,
      socialProfiles: ["@janeunique"],
    });

    const handleIndex = social.findIndex((query) =>
      query.text.includes('"@janeunique"'),
    );
    const instagramIndex = social.findIndex((query) =>
      query.text.includes("site:instagram.com"),
    );

    expect(handleIndex).toBeGreaterThanOrEqual(0);
    expect(instagramIndex).toBeGreaterThan(handleIndex);
  });

  it("adds official and concern-oriented queries only after confirmation", () => {
    const deep = buildDeepQueries({
      ...base,
      mode: "deep",
      claim: "Founder of Example AG",
      confirmedIdentity: {
        label: "Jane",
        confidence: "high",
        supportingSignals: [],
        urls: ["https://example.org/jane"],
      },
    });

    expect(deep.some((query) => query.kind === "official")).toBe(true);
    expect(deep.some((query) => query.kind === "concern")).toBe(true);
    expect(deep.some((query) => query.kind === "claim")).toBe(true);
  });

  it("keeps the confirmed identity search name exact in deep research", () => {
    const deep = buildDeepQueries({
      ...base,
      mode: "deep",
      confirmedIdentity: {
        label: "Jane Unique-Surname",
        searchName: "Jane Unique-Surname",
        confidence: "medium",
        supportingSignals: [],
        urls: ["https://example.org/jane"],
      },
    }).map((query) => query.text);

    expect(deep).toContain('"Jane Unique-Surname"');
    expect(deep).not.toContain("Jane Unique-Surname");
    expect(deep.every((query) => query.includes('"Jane Unique-Surname"'))).toBe(
      true,
    );
  });

  it("deduplicates repeated query strings", () => {
    const queries = buildDeepQueries({
      ...base,
      mode: "deep",
      confirmedIdentity: {
        label: "Jane",
        confidence: "high",
        supportingSignals: [],
        urls: [
          "https://example.org/jane",
          "https://example.org/another-profile",
        ],
      },
    });

    const texts = queries.map((query) => query.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });
});
