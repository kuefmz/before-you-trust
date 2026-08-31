import { describe, expect, it } from "vitest";

import {
  canonicalNameWords,
  containsExactFullName,
  exactNameSearchVariant,
  urlPathContainsExactFullName,
} from "@/lib/exact-name";

describe("strict exact-name normalization", () => {
  it("treats hyphenation and spacing as the same exact token sequence", () => {
    expect(
      containsExactFullName(
        "Jane Tabita Unique-Surname — data engineer",
        "Jane Tabita Unique Surname",
      ),
    ).toBe(true);
    expect(
      containsExactFullName(
        "Jane Tabita Unique Surname — data engineer",
        "Jane Tabita Unique-Surname",
      ),
    ).toBe(true);
  });

  it("treats apostrophe punctuation as exact but rejects spelling changes", () => {
    expect(containsExactFullName("Manti Te'o", "Manti Te o")).toBe(true);
    expect(containsExactFullName("Manti Te'ox", "Manti Te'o")).toBe(false);
  });

  it("rejects similar surnames", () => {
    expect(containsExactFullName("Sasza Swiatecki", "Sasza Swiatek")).toBe(
      false,
    );
  });

  it("recognizes exact names in social profile URL slugs", () => {
    expect(
      urlPathContainsExactFullName(
        "https://www.linkedin.com/in/jane-tabita-unique-surname",
        "Jane Tabita Unique-Surname",
      ),
    ).toBe(true);
  });

  it("creates a punctuation-neutral exact search variant", () => {
    expect(exactNameSearchVariant("Jane Tabita Unique-Surname")).toBe(
      "jane tabita unique surname",
    );
    expect(canonicalNameWords("Manti Te'o")).toEqual(["manti", "te", "o"]);
  });
});
