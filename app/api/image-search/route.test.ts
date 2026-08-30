import { beforeEach, describe, expect, it } from "vitest";

import { resetRateLimitForTests } from "@/lib/rate-limit";
import { POST } from "./route";

beforeEach(() => {
  resetRateLimitForTests();
  process.env.E2E_MOCK_IMAGE_SEARCH = "true";
  process.env.CI = "true";
});

function request(file?: File) {
  const body = new FormData();
  if (file) body.append("photo", file);
  return new Request("http://localhost/api/image-search", {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.22", "user-agent": "vitest" },
    body,
  });
}

describe("POST /api/image-search", () => {
  it("returns public web-image matches for a supported photo", async () => {
    const response = await POST(request(new File([new Uint8Array([1, 2, 3])], "person.png", { type: "image/png" })));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const payload = await response.json();
    expect(payload.provider).toBe("mock-image");
    expect(payload.matches.length).toBeGreaterThan(0);
  });

  it("rejects unsupported image types", async () => {
    const response = await POST(request(new File(["x"], "person.gif", { type: "image/gif" })));
    expect(response.status).toBe(415);
  });

  it("requires a photo", async () => {
    const response = await POST(request());
    expect(response.status).toBe(400);
  });
});