import { beforeEach, describe, expect, it } from "vitest";

import { resetRateLimitForTests } from "@/lib/rate-limit";
import { resetRuntimeConfigForTests } from "@/lib/runtime-config";
import { POST } from "./route";

beforeEach(() => {
  resetRateLimitForTests();
  resetRuntimeConfigForTests();
  process.env.E2E_MOCK_EMAIL = "true";
  process.env.CI = "true";
  process.env.OWNER_NOTIFICATION_EMAIL = "owner@example.test";
});

function request(body: unknown) {
  return new Request("http://localhost/api/report-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "198.51.100.40",
      "user-agent": "vitest",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/report-email", () => {
  it("delivers a report through the transactional email path", async () => {
    const response = await POST(request({
      email: "reader@example.com",
      reportLabel: "Example Person",
      consentAccepted: true,
      website: "",
      results: [{
        title: "Public profile",
        url: "https://example.org/person",
        snippet: "Public source",
        sourceType: "professional",
      }],
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ ok: true });
  });

  it("rejects an invalid recipient", async () => {
    const response = await POST(request({
      email: "not-email",
      reportLabel: "Example Person",
      consentAccepted: true,
      results: [{
        title: "Public profile",
        url: "https://example.org/person",
        snippet: "",
        sourceType: "professional",
      }],
    }));
    expect(response.status).toBe(400);
  });
});