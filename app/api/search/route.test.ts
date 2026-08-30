import { beforeEach, describe, expect, it } from "vitest";

import { resetRateLimitForTests } from "@/lib/rate-limit";

import { POST } from "./route";

beforeEach(() => {
  resetRateLimitForTests();
  process.env.SEARCH_PROVIDER = "mock";
  process.env.E2E_MOCK_SEARCH = "true";
});

function request(body: unknown, ip = "203.0.113.10") {
  return new Request("http://localhost/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": "vitest",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/search", () => {
  it("returns identity search results without caching", async () => {
    const response = await POST(
      request({
        name: "Jane Unique-Surname",
        location: "Zurich",
        company: "Example AG",
        mode: "identity",
        lawfulUseAccepted: true,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");

    const payload = await response.json();
    expect(payload.mode).toBe("identity");
    expect(payload.results.length).toBeGreaterThan(0);
    expect(payload.providers).toContain("mock");
  });

  it("rejects malformed requests", async () => {
    const response = await POST(
      request({
        name: "J",
        mode: "identity",
        lawfulUseAccepted: true,
      }),
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.code).toBe("INVALID_REQUEST");
  });

  it("requires identity confirmation before deep search", async () => {
    const response = await POST(
      request({
        name: "Jane Unique-Surname",
        mode: "deep",
        lawfulUseAccepted: true,
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns deep results after confirmation", async () => {
    const response = await POST(
      request({
        name: "Jane Unique-Surname",
        mode: "deep",
        lawfulUseAccepted: true,
        confirmedIdentity: {
          label: "Jane Unique-Surname",
          confidence: "high",
          supportingSignals: ["Context matches"],
          urls: ["https://linkedin.com/in/jane-unique-surname"],
        },
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.mode).toBe("deep");
    expect(
      payload.results.some((item: { queryKinds: string[] }) =>
        item.queryKinds.includes("concern"),
      ),
    ).toBe(true);
  });
});
