import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  analyticsConsentKey,
  hasAnalyticsConsent,
  trackEvent,
} from "@/lib/client-analytics";

describe("client analytics", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete (window as Window & { dataLayer?: unknown[] }).dataLayer;
    delete (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  });

  it("does nothing without analytics consent", () => {
    expect(hasAnalyticsConsent()).toBe(false);
    trackEvent("search_started", { mode: "identity" });
    expect(
      (window as Window & { dataLayer?: unknown[] }).dataLayer,
    ).toBeUndefined();
  });

  it("sends coarse events through gtag when direct GA4 is loaded", () => {
    window.localStorage.setItem(analyticsConsentKey, "granted");
    const gtag = vi.fn();
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag = gtag;

    trackEvent("search_completed", { result_count: 4 });

    expect(gtag).toHaveBeenCalledWith("event", "search_completed", {
      result_count: 4,
    });
  });

  it("falls back to dataLayer events for GTM-only setups", () => {
    window.localStorage.setItem(analyticsConsentKey, "granted");
    trackEvent("search_completed", { result_count: 4 });

    expect(
      (window as Window & { dataLayer?: unknown[] }).dataLayer,
    ).toEqual([{ event: "search_completed", result_count: 4 }]);
  });
});
