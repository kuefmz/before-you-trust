import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ManualSearchPanel } from "@/components/ManualSearchPanel";

describe("ManualSearchPanel", () => {
  it("turns focused queries into user-initiated Google searches", () => {
    render(
      <ManualSearchPanel
        queries={[
          {
            text: '"Jane Unique-Surname" site:instagram.com',
            kind: "social",
          },
          {
            text: '"Jane Unique-Surname" "Zurich"',
            kind: "identity",
          },
        ]}
      />,
    );

    const instagram = screen.getByRole("link", {
      name: "Search Google ↗",
    });
    expect(instagram).toHaveAttribute("target", "_blank");

    const links = screen.getAllByRole("link", { name: "Search Google ↗" });
    expect(links[0]?.getAttribute("href")).toContain(
      "google.com/search?q=",
    );
    expect(screen.getByText("Instagram")).toBeInTheDocument();
    expect(screen.getByText("Identity")).toBeInTheDocument();
  });

  it("prompts for a name when no queries are available", () => {
    render(<ManualSearchPanel queries={[]} />);
    expect(screen.getByText(/Enter a full name first/i)).toBeInTheDocument();
  });
});
