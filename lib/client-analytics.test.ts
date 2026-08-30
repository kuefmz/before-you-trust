import { beforeEach, describe, expect, it } from "vitest";

import {
  analyticsConsentKey,
  hasAnalyticsConsent,
  trackEvent,
} from "@/lib/client-analytics";

describe("client analytics", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete (window as Window & { dataLayer?: unknown[] }).dataLayer;
  });

  it("does nothing without analytics consent", () => {
    expect(hasAnalyticsConsent()).toBe(false);
    trackEvent("search_started", { mode: "identity" });
    expect(
      (window as Window & { dataLayer?: unknown[] }).dataLayer,
    ).toBeUndefined();
  });

  it("pushes only explicit coarse event parameters after consent", () => {
    window.localStorage.setItem(analyticsConsentKey, "granted");
    trackEvent("search_completed", { result_count: 4 });

    expect(
      (window as Window & { dataLayer?: unknown[] }).dataLayer,
    ).toEqual([{ event: "search_completed", result_count: 4 }]);
  });
});
