import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { analyticsConsentKey } from "@/lib/client-analytics";

describe("AnalyticsConsent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.getElementById("byt-gtm-script")?.remove();
    document.getElementById("byt-ga4-script")?.remove();
    delete (window as Window & { dataLayer?: unknown[] }).dataLayer;
    delete (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  });

  afterEach(() => {
    document.getElementById("byt-gtm-script")?.remove();
    document.getElementById("byt-ga4-script")?.remove();
  });

  it("renders nothing when analytics is not configured", () => {
    render(<AnalyticsConsent />);
    expect(
      screen.queryByRole("dialog", { name: "Analytics preferences" }),
    ).not.toBeInTheDocument();
  });

  it("does not load GA4 when analytics is rejected", async () => {
    const user = userEvent.setup();
    render(<AnalyticsConsent ga4Id="G-TEST" />);

    await user.click(screen.getByRole("button", { name: "Reject analytics" }));

    expect(window.localStorage.getItem(analyticsConsentKey)).toBe("denied");
    expect(document.getElementById("byt-ga4-script")).toBeNull();
  });

  it("loads GA4 only after analytics is granted", async () => {
    const user = userEvent.setup();
    render(<AnalyticsConsent ga4Id="G-TEST" />);

    await user.click(screen.getByRole("button", { name: "Allow analytics" }));

    expect(window.localStorage.getItem(analyticsConsentKey)).toBe("granted");
    expect(document.getElementById("byt-ga4-script")).toHaveAttribute(
      "src",
      expect.stringContaining("G-TEST"),
    );
  });

  it("still supports optional GTM after analytics is granted", async () => {
    const user = userEvent.setup();
    render(<AnalyticsConsent gtmId="GTM-TEST" />);

    await user.click(screen.getByRole("button", { name: "Allow analytics" }));

    expect(document.getElementById("byt-gtm-script")).toHaveAttribute(
      "src",
      expect.stringContaining("GTM-TEST"),
    );
  });
});
