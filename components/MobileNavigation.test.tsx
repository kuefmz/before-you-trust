import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MobileNavigation } from "@/components/MobileNavigation";

describe("MobileNavigation", () => {
  it("shows support and opens/closes the mobile menu", async () => {
    const user = userEvent.setup();

    render(
      <MobileNavigation supportUrl="https://www.buymeacoffee.com/example" />,
    );

    expect(screen.getByRole("link", { name: /coffee/i })).toHaveAttribute(
      "href",
      "https://www.buymeacoffee.com/example",
    );

    const toggle = screen.getByRole("button", {
      name: "Open navigation menu",
    });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);

    expect(
      screen.getByRole("navigation", { name: "Mobile primary navigation" }),
    ).toBeVisible();
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");

    expect(
      screen.getByRole("button", { name: "Open navigation menu" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the menu after choosing an internal destination", async () => {
    const user = userEvent.setup();

    render(<MobileNavigation />);

    await user.click(
      screen.getByRole("button", { name: "Open navigation menu" }),
    );
    await user.click(screen.getByRole("link", { name: "About" }));

    expect(
      screen.getByRole("button", { name: "Open navigation menu" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /coffee/i })).not.toBeInTheDocument();
  });
});
