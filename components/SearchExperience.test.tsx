import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchExperience } from "@/components/SearchExperience";
import type { SearchResponse } from "@/types/search";

const identityResponse: SearchResponse = {
  requestId: "identity",
  mode: "identity",
  providers: ["mock"],
  queriesRun: 3,
  warnings: [],
  results: [
    {
      title: "Jane Unique-Surname | LinkedIn",
      url: "https://linkedin.com/in/jane",
      snippet: "Data professional at Example AG in Zurich",
      sourceType: "professional",
      publishedAt: null,
      providers: ["mock"],
      queries: ['"Jane Unique-Surname"'],
      queryKinds: ["identity"],
    },
    {
      title: "Jane Unique-Surname · GitHub",
      url: "https://github.com/jane",
      snippet: "Zurich. Example AG.",
      sourceType: "professional",
      publishedAt: null,
      providers: ["mock"],
      queries: ['"Jane Unique-Surname" Example AG'],
      queryKinds: ["professional"],
    },
  ],
};

const deepResponse: SearchResponse = {
  requestId: "deep",
  mode: "deep",
  providers: ["mock"],
  queriesRun: 4,
  warnings: [],
  results: [
    {
      title: "Example public registry",
      url: "https://justice.gov/example-jane",
      snippet: "Official-source fixture",
      sourceType: "official",
      publishedAt: null,
      providers: ["mock"],
      queries: ['"Jane Unique-Surname" court'],
      queryKinds: ["official"],
    },
    {
      title: "Example news result",
      url: "https://www.reuters.com/example-jane",
      snippet: "News-source fixture",
      sourceType: "news",
      publishedAt: null,
      providers: ["mock"],
      queries: ['"Jane Unique-Surname" complaint'],
      queryKinds: ["concern"],
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SearchExperience", () => {
  it("walks through identity confirmation into a Trust Brief", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(identityResponse), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(deepResponse), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchExperience />);

    await user.type(screen.getByLabelText("Full name *"), "Jane Unique-Surname");
    await user.type(screen.getByLabelText("City or country"), "Zurich");
    await user.type(
      screen.getByLabelText("Employer or organization"),
      "Example AG",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: "Search the public web →" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Which person do you mean?" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "This is them" })[0]!,
    );

    expect(
      await screen.findByRole("heading", { name: "Trust Brief" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Needs closer review" }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not start deep research until the only match is confirmed", async () => {
    const user = userEvent.setup();
    const oneMatch: SearchResponse = {
      ...identityResponse,
      results: [identityResponse.results[0]!],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(oneMatch), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(deepResponse), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchExperience />);
    await user.type(screen.getByLabelText("Full name *"), "Jane Unique-Surname");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Search the public web →" }));

    expect(await screen.findByText(/one likely identity/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: "Trust Brief" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "This is them" }));
    expect(await screen.findByRole("heading", { name: "Trust Brief" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not call the API without responsible-use confirmation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchExperience />);
    await user.type(screen.getByLabelText("Full name *"), "Jane Unique-Surname");
    await user.click(
      screen.getByRole("button", { name: "Search the public web →" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "responsible and lawful use",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
