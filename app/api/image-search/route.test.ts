import { beforeEach, describe, expect, it } from "vitest";

import { resetRateLimitForTests } from "@/lib/rate-limit";
import { POST } from "./route";

beforeEach(() => {
  resetRateLimitForTests();
  process.env.E2E_MOCK_IMAGE_SEARCH = "true";
  process.env.CI = "true";
});

function request(
  options: { fileName?: string; mimeType?: string; content?: string } = {},
) {
  const boundary = "----before-you-trust-test-boundary";
  const headers: Record<string, string> = {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "x-forwarded-for": "203.0.113.22",
    "user-agent": "vitest",
  };

  let body = `--${boundary}--\r\n`;
  if (options.fileName) {
    body = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="photo"; filename="${options.fileName}"`,
      `Content-Type: ${options.mimeType ?? "image/png"}`,
      "",
      options.content ?? "abc",
      `--${boundary}--`,
      "",
    ].join("\r\n");
  }

  return new Request("http://localhost/api/image-search", {
    method: "POST",
    headers,
    body,
  });
}

describe("POST /api/image-search", () => {
  it("returns public web-image matches for a supported photo", async () => {
    const response = await POST(
      request({ fileName: "person.png", mimeType: "image/png" }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const payload = await response.json();
    expect(payload.provider).toBe("mock-image");
    expect(payload.matches.length).toBeGreaterThan(0);
  });

  it("rejects unsupported image types", async () => {
    const response = await POST(
      request({ fileName: "person.gif", mimeType: "image/gif" }),
    );
    expect(response.status).toBe(415);
  });

  it("requires a photo", async () => {
    const response = await POST(request());
    expect(response.status).toBe(400);
  });
});
