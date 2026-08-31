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
      snippet: "Jane Unique-Surname in Zurich at Example AG. Official-source fixture",
      sourceType: "official",
      publishedAt: null,
      providers: ["mock"],
      queries: ['"Jane Unique-Surname" court'],
      queryKinds: ["official"],
    },
    {
      title: "Example news result",
      url: "https://www.reuters.com/example-jane",
      snippet: "Jane Unique-Surname in Zurich at Example AG. News-source fixture",
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

  it("sends only the clicked candidate into deep search", async () => {
    const user = userEvent.setup();
    const namesakes: SearchResponse = {
      ...identityResponse,
      results: [
        {
          ...identityResponse.results[0]!,
          title: "Alex Morgan | LinkedIn",
          url: "https://linkedin.com/in/alex-morgan-zurich",
          snippet: "Engineer in Zurich at Alpha AG",
        },
        {
          ...identityResponse.results[0]!,
          title: "Alex Morgan | LinkedIn",
          url: "https://linkedin.com/in/alex-morgan-london",
          snippet: "Designer in London at Beta Ltd",
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(namesakes), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ...deepResponse, results: [] }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<SearchExperience />);
    await user.type(screen.getByLabelText("Full name *"), "Alex Morgan");
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: "Search the public web →" }),
    );

    const buttons = await screen.findAllByRole("button", { name: "This is them" });
    expect(buttons).toHaveLength(2);
    await user.click(buttons[1]!);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const deepOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const deepBody = JSON.parse(String(deepOptions.body)) as {
      confirmedIdentity: { urls: string[] };
    };
    expect(deepBody.confirmedIdentity.urls).toContain(
      "https://linkedin.com/in/alex-morgan-london",
    );
    expect(deepBody.confirmedIdentity.urls).not.toContain(
      "https://linkedin.com/in/alex-morgan-zurich",
    );
  });

  it("labels low-confidence candidates as possibilities", async () => {
    const user = userEvent.setup();
    const lowConfidenceResponse: SearchResponse = {
      ...identityResponse,
      results: [
        {
          ...identityResponse.results[0]!,
          title: "Professional profile",
          url: "https://linkedin.com/in/sasza-swiatek",
          snippet: "Sasza Swiatek public professional profile",
          sourceType: "professional",
        },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(lowConfidenceResponse), { status: 200 }),
      ),
    );

    render(<SearchExperience />);
    await user.type(screen.getByLabelText("Full name *"), "Sasza Swiatek");
    await user.type(screen.getByLabelText("City or country"), "Zurich");
    await user.type(
      screen.getByLabelText("Employer or organization"),
      "UBS",
    );
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: "Search the public web →" }),
    );

    expect(
      await screen.findByText(/low-confidence possibilit/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Low-confidence identity leads only/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Possible match #1/i)).toBeInTheDocument();
  });

  it("warns when broad SearXNG discovery did not contribute", async () => {
    const user = userEvent.setup();
    const yacyOnlyResponse: SearchResponse = {
      ...identityResponse,
      providers: ["yacy"],
      results: [
        {
          ...identityResponse.results[0]!,
          title: "LinkedIn",
          url: "https://www.linkedin.com/in/sasza-swiatek",
          snippet: "Sasza Swiatek public profile",
          sourceType: "professional",
        },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(yacyOnlyResponse), { status: 200 }),
      ),
    );

    render(<SearchExperience />);
    await user.type(screen.getByLabelText("Full name *"), "Sasza Swiatek");
    await user.click(screen.getByRole("checkbox"));
    await user.click(
      screen.getByRole("button", { name: "Search the public web →" }),
    );

    expect(
      await screen.findByText(/Broad web discovery is currently unavailable/i),
    ).toBeInTheDocument();
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
