import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetRateLimitForTests } from "@/lib/rate-limit";
import { resetRuntimeConfigForTests } from "@/lib/runtime-config";
import { POST } from "./route";

beforeEach(() => {
  vi.unstubAllGlobals();
  resetRateLimitForTests();
  resetRuntimeConfigForTests();
  process.env.REPORT_APPS_SCRIPT_SECRET = "test-secret";
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
  it("delivers a report through Google Apps Script", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, requestId: "sheet-1" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(request({
      email: "reader@example.com",
      reportLabel: "Example Person",
      searchedName: "Example Person",
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
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(options.body)) as Record<string, unknown>;
    expect(body.apiSecret).toBe("test-secret");
    expect(body.userEmail).toBe("reader@example.com");
    expect(body.searchedName).toBe("Example Person");
  });

  it("rejects an invalid recipient", async () => {
    const response = await POST(request({
      email: "not-email",
      reportLabel: "Example Person",
      searchedName: "Example Person",
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
