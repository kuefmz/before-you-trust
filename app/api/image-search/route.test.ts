import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetRateLimitForTests } from "@/lib/rate-limit";
import { POST } from "./route";

beforeEach(() => {
  resetRateLimitForTests();
  process.env.E2E_MOCK_IMAGE_SEARCH = "true";
  process.env.CI = "true";
});

function request(file?: { type: string; bytes: Uint8Array }): Request {
  const fileLike = file
    ? {
        type: file.type,
        size: file.bytes.byteLength,
        arrayBuffer: vi.fn().mockResolvedValue(
          file.bytes.buffer.slice(
            file.bytes.byteOffset,
            file.bytes.byteOffset + file.bytes.byteLength,
          ),
        ),
      }
    : null;

  return {
    headers: new Headers({
      "x-forwarded-for": "203.0.113.22",
      "user-agent": "vitest",
    }),
    formData: vi.fn().mockResolvedValue({
      get: (key: string) => (key === "photo" ? fileLike : null),
    }),
  } as unknown as Request;
}

describe("POST /api/image-search", () => {
  it("returns public web-image matches for a supported photo", async () => {
    const response = await POST(
      request({ type: "image/png", bytes: new Uint8Array([1, 2, 3]) }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const payload = await response.json();
    expect(payload.provider).toBe("mock-image");
    expect(payload.matches.length).toBeGreaterThan(0);
  });

  it("rejects unsupported image types", async () => {
    const response = await POST(
      request({ type: "image/gif", bytes: new Uint8Array([1]) }),
    );
    expect(response.status).toBe(415);
  });

  it("requires a photo", async () => {
    const response = await POST(request());
    expect(response.status).toBe(400);
  });
});
