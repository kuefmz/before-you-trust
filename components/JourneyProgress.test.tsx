import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { JourneyProgress } from "@/components/JourneyProgress";

describe("JourneyProgress", () => {
  it("shows the complete four-step lifecycle", () => {
    render(<JourneyProgress step={2} />);
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("offers persistent new-search and DIY actions when configured", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    const toggle = vi.fn();

    render(
      <JourneyProgress
        onStartNewSearch={reset}
        onToggleManualSearch={toggle}
        step={2}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Start new search" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Do it yourself" }),
    );

    expect(reset).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveBeenCalledTimes(1);
  });
});
