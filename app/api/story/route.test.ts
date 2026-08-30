import { beforeEach, describe, expect, it } from "vitest";

import { resetRateLimitForTests } from "@/lib/rate-limit";

import { POST } from "./route";

beforeEach(() => {
  resetRateLimitForTests();
  process.env.E2E_MOCK_EMAIL = "true";
  process.env.NODE_ENV = "test";
  process.env.OWNER_NOTIFICATION_EMAIL = "owner@example.test";
});

function request(body: unknown, ip = "198.51.100.9") {
  return new Request("http://localhost/api/story", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": "vitest",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/story", () => {
  it("delivers a valid private story submission", async () => {
    const response = await POST(
      request({
        topic: "story",
        name: "Jane",
        email: "jane@example.com",
        message:
          "This is a detailed story about information I wish I had checked earlier.",
        permissionToPublish: false,
        adultConfirmed: true,
        privacyAccepted: true,
        website: "",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.submissionId).toBeTruthy();
  });

  it("rejects bot honeypot submissions", async () => {
    const response = await POST(
      request({
        topic: "story",
        message:
          "This is a detailed submission but the invisible bot field is populated.",
        adultConfirmed: true,
        privacyAccepted: true,
        website: "spam",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rate limits repeated submissions", async () => {
    const body = {
      topic: "privacy",
      message:
        "Please process this sufficiently detailed privacy request about my data.",
      privacyAccepted: true,
    };

    for (let index = 0; index < 5; index += 1) {
      expect((await POST(request(body))).status).toBe(200);
    }
    expect((await POST(request(body))).status).toBe(429);
  });
});
