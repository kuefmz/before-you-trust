import { describe, expect, it } from "vitest";

import { buildDeepQueries, buildIdentityQueries } from "@/lib/queries";
import type { SearchInput } from "@/types/search";

const base: SearchInput = {
  name: "Jane Unique-Surname",
  location: "Zurich, Switzerland",
  company: "Example AG",
  username: "janeunique",
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

  it("searches major social platforms in the identity stage", () => {
    const social = buildIdentityQueries({
      ...base,
      socialProfiles: ["@janeunique", "https://instagram.com/janeunique"],
    });
    expect(social.some((query) => query.kind === "social")).toBe(true);
    expect(social.some((query) => query.text.includes("instagram.com"))).toBe(true);
    expect(social.some((query) => query.text.includes("tiktok.com"))).toBe(true);
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
