import { describe, expect, it } from "vitest";

import { validateSearchRequest } from "@/lib/validation";

describe("validateSearchRequest", () => {
  it("normalizes a valid identity request", () => {
    const result = validateSearchRequest({
      name: "  Jane   Unique-Surname ",
      location: " Zurich ",
      mode: "identity",
      lawfulUseAccepted: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Jane Unique-Surname");
      expect(result.data.location).toBe("Zurich");
    }
  });

  it("accepts company searches and preserves their subject type", () => {
    const result = validateSearchRequest({
      name: "Example Shop",
      subjectType: "company",
      profileUrl: "https://example-shop.test",
      mode: "identity",
      lawfulUseAccepted: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.subjectType).toBe("company");
      expect(result.data.name).toBe("Example Shop");
    }
  });

  it("defaults existing searches to a person subject", () => {
    const result = validateSearchRequest({
      name: "Jane Unique-Surname",
      mode: "identity",
      lawfulUseAccepted: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.subjectType).toBe("person");
  });

  it("requires responsible-use confirmation", () => {
    const result = validateSearchRequest({
      name: "Jane Unique-Surname",
      mode: "identity",
      lawfulUseAccepted: false,
    });

    expect(result).toEqual({
      ok: false,
      error: "You must confirm responsible and lawful use before searching.",
    });
  });

  it("rejects non-http profile URLs", () => {
    const result = validateSearchRequest({
      name: "Jane Unique-Surname",
      profileUrl: "javascript:alert(1)",
      mode: "identity",
      lawfulUseAccepted: true,
    });

    expect(result.ok).toBe(false);
  });

  it("accepts social profile clues and handles", () => {
    const result = validateSearchRequest({
      name: "Jane Unique-Surname",
      socialProfiles: ["@jane", "https://instagram.com/jane"],
      mode: "identity",
      lawfulUseAccepted: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.socialProfiles).toHaveLength(2);
  });

  it("rejects malformed social handles", () => {
    const result = validateSearchRequest({
      name: "Jane Unique-Surname",
      socialProfiles: ["bad handle with spaces"],
      mode: "identity",
      lawfulUseAccepted: true,
    });
    expect(result.ok).toBe(false);
  });

  it("requires identity confirmation for deep search", () => {
    const result = validateSearchRequest({
      name: "Jane Unique-Surname",
      mode: "deep",
      lawfulUseAccepted: true,
    });

    expect(result).toEqual({
      ok: false,
      error: "A confirmed identity is required for a deep search.",
    });
  });

  it("accepts a validated deep search", () => {
    const result = validateSearchRequest({
      name: "Jane Unique-Surname",
      mode: "deep",
      lawfulUseAccepted: true,
      confirmedIdentity: {
        label: "Jane",
        confidence: "high",
        supportingSignals: ["Location matches"],
        urls: ["https://example.org/jane"],
      },
    });

    expect(result.ok).toBe(true);
  });
});
