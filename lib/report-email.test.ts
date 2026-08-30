import { describe, expect, it, vi } from "vitest";

import { renderReportEmail, validateReportEmailRequest } from "@/lib/report-email";

describe("report email validation", () => {
  const valid = {
    email: "reader@example.com",
    reportLabel: "Example Person",
    consentAccepted: true,
    results: [{
      title: "Public profile",
      url: "https://example.org/person",
      snippet: "Public source",
      sourceType: "professional",
    }],
  };

  it("accepts a valid report-delivery request", () => {
    const result = validateReportEmailRequest(valid);
    expect(result.ok).toBe(true);
  });

  it("rejects delivery without explicit email-processing acknowledgement", () => {
    const result = validateReportEmailRequest({ ...valid, consentAccepted: false });
    expect(result.ok).toBe(false);
  });

  it("renders the source links and disclaimer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-30T18:00:00Z"));
    const result = validateReportEmailRequest(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const text = renderReportEmail(result.data);
      expect(text).toContain("https://example.org/person");
      expect(text).toContain("does not prove safety");
    }
    vi.useRealTimers();
  });
});