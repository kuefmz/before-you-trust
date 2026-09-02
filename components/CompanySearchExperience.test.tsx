import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompanySearchExperience } from "@/components/CompanySearchExperience";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CompanySearchExperience", () => {
  it("requires responsible-use confirmation", async () => {
    const user = userEvent.setup();

    render(<CompanySearchExperience />);

    await user.type(
      screen.getByLabelText("Company or shop name *"),
      "Example Shop",
    );
    await user.type(
      screen.getByLabelText("Website URL *"),
      "https://example-shop.test",
    );
    await user.click(
      screen.getByRole("button", { name: "Check this company →" }),
    );

    expect(
      screen.getByRole("alert"),
    ).toHaveTextContent("Please confirm responsible and lawful use");
  });

  it("uses the existing search API with company mode and renders grouped results", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          requestId: "company-1",
          mode: "deep",
          providers: ["searxng"],
          queriesRun: 10,
          warnings: [],
          results: [
            {
              title: "Example Shop registry",
              url: "https://registry.test/example-shop",
              snippet: "Registry entry",
              sourceType: "official",
              publishedAt: null,
              providers: ["searxng"],
              queries: ['"Example Shop" registry'],
              queryKinds: ["official"],
            },
            {
              title: "Example Shop reviews",
              url: "https://reviews.test/example-shop",
              snippet: "Independent reviews",
              sourceType: "web",
              publishedAt: null,
              providers: ["searxng"],
              queries: ['"Example Shop" reviews'],
              queryKinds: ["general"],
            },
            {
              title: "Example Shop in the news",
              url: "https://news.test/example-shop",
              snippet: "Coverage",
              sourceType: "news",
              publishedAt: null,
              providers: ["searxng"],
              queries: ['"Example Shop" news'],
              queryKinds: ["news"],
            },
            {
              title: "Authorized reseller claim",
              url: "https://claim.test/example-shop",
              snippet: "Claim discussion",
              sourceType: "web",
              publishedAt: null,
              providers: ["searxng"],
              queries: ['"Example Shop" "Authorized reseller"'],
              queryKinds: ["claim"],
            },
            {
              title: "Example Shop complaints",
              url: "https://forum.test/example-shop",
              snippet: "Complaint thread",
              sourceType: "web",
              publishedAt: null,
              providers: ["searxng"],
              queries: ['"Example Shop" complaints'],
              queryKinds: ["concern"],
            },
          ],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CompanySearchExperience />);

    await user.type(
      screen.getByLabelText("Company or shop name *"),
      "Example Shop",
    );
    await user.type(
      screen.getByLabelText("Website URL *"),
      "https://example-shop.test",
    );
    await user.type(
      screen.getByLabelText("Country or location"),
      "Switzerland",
    );
    await user.type(
      screen.getByLabelText("Specific claim to check"),
      "Authorized reseller",
    );
    await user.click(
      screen.getByRole("checkbox"),
    );
    await user.click(
      screen.getByRole("button", { name: "Check this company →" }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body));

    expect(body).toMatchObject({
      name: "Example Shop",
      subjectType: "company",
      location: "Switzerland",
      profileUrl: "https://example-shop.test",
      claim: "Authorized reseller",
      context: "business",
      mode: "deep",
      lawfulUseAccepted: true,
    });
    expect(body.confirmedIdentity.searchName).toBe("Example Shop");

    expect(
      await screen.findByRole("heading", { name: "Example Shop" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Official & registry sources" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Public footprint & reviews" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "News & independent coverage" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Claim-specific evidence" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Complaints & warning signals" }),
    ).toBeInTheDocument();
  });
});
