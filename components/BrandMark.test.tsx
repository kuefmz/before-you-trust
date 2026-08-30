import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandMark } from "@/components/BrandMark";

describe("BrandMark", () => {
  it("renders as decorative SVG at the requested size", () => {
    const { container } = render(<BrandMark size={48} />);
    const svg = container.querySelector("svg");

    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("width", "48");
    expect(svg).toHaveAttribute("height", "48");
  });
});
