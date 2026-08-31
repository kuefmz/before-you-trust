import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetRateLimitForTests } from "@/lib/rate-limit";
import { resetRuntimeConfigForTests } from "@/lib/runtime-config";
import { POST } from "./route";

beforeEach(() => {
  vi.unstubAllGlobals();
  resetRateLimitForTests();
  resetRuntimeConfigForTests();
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
    expect(body.userEmail).toBe("reader@example.com");
    expect(body.searchedName).toBe("Example Person");
  });

  it("accepts a legitimate large Trust Brief instead of rejecting it at 75 KB", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, requestId: "sheet-large" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const results = Array.from({ length: 70 }, (_, index) => ({
      title: `Public profile ${index + 1}`,
      url: `https://example.org/person/${index + 1}`,
      snippet: "A".repeat(700),
      sourceType: "professional",
    }));

    const response = await POST(request({
      email: "reader@example.com",
      reportLabel: "Example Person",
      searchedName: "Example Person",
      consentAccepted: true,
      website: "",
      results,
    }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a clear error when Apps Script responds with a Google access page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          "<html><body>Sign in with Google</body></html>",
          {
            status: 200,
            headers: { "Content-Type": "text/html" },
          },
        ),
      ),
    );

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

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: {
        code: "REPORT_APPS_SCRIPT_ACCESS",
        message:
          "The Google Apps Script web app is not accessible to the report service. Redeploy it as a Web app that executes as you and allows access to Anyone.",
      },
    });
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
