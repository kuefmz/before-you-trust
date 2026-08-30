import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { JourneyProgress } from "@/components/JourneyProgress";

describe("JourneyProgress", () => {
  it("shows the complete four-step lifecycle", () => {
    render(<JourneyProgress step={2} />);
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });
});