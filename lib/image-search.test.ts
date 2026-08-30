import { afterEach, describe, expect, it } from "vitest";

import { searchImageOnWeb } from "@/lib/image-search";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("image web search", () => {
  it("uses only the gated CI mock when explicitly enabled", async () => {
    process.env.E2E_MOCK_IMAGE_SEARCH = "true";
    process.env.CI = "true";
    const result = await searchImageOnWeb(new Uint8Array([1, 2, 3]));
    expect(result.provider).toBe("mock-image");
    expect(result.matches.some((item) => item.queryKinds.includes("image"))).toBe(true);
  });
});