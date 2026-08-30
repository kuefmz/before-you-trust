import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { analyticsConsentKey } from "@/lib/client-analytics";

describe("AnalyticsConsent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.getElementById("byt-gtm-script")?.remove();
    delete (window as Window & { dataLayer?: unknown[] }).dataLayer;
  });

  afterEach(() => {
    document.getElementById("byt-gtm-script")?.remove();
  });

  it("renders nothing when GTM is not configured", () => {
    render(<AnalyticsConsent />);
    expect(
      screen.queryByRole("dialog", { name: "Analytics preferences" }),
    ).not.toBeInTheDocument();
  });

  it("does not load GTM when analytics is rejected", async () => {
    const user = userEvent.setup();
    render(<AnalyticsConsent gtmId="GTM-TEST" />);

    await user.click(screen.getByRole("button", { name: "Reject analytics" }));

    expect(window.localStorage.getItem(analyticsConsentKey)).toBe("denied");
    expect(document.getElementById("byt-gtm-script")).toBeNull();
  });

  it("loads GTM only after analytics is granted", async () => {
    const user = userEvent.setup();
    render(<AnalyticsConsent gtmId="GTM-TEST" />);

    await user.click(screen.getByRole("button", { name: "Allow analytics" }));

    expect(window.localStorage.getItem(analyticsConsentKey)).toBe("granted");
    expect(document.getElementById("byt-gtm-script")).toHaveAttribute(
      "src",
      expect.stringContaining("GTM-TEST"),
    );
  });
});
