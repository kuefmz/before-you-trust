import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { SupportLink } from "@/components/SupportLink";
import { analyticsConsentKey } from "@/lib/client-analytics";

describe("SupportLink", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete (window as Window & { dataLayer?: unknown[] }).dataLayer;
  });

  it("opens externally and records only a coarse click event after consent", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(analyticsConsentKey, "granted");

    render(<SupportLink href="https://www.buymeacoffee.com/example" />);
    const link = screen.getByRole("link", { name: "Buy me a coffee" });
    expect(link).toHaveAttribute("target", "_blank");

    await user.click(link);
    expect(
      (window as Window & { dataLayer?: unknown[] }).dataLayer,
    ).toEqual([{ event: "support_click" }]);
  });
});
