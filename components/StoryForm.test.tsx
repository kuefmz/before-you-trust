import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StoryForm } from "@/components/StoryForm";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StoryForm", () => {
  it("submits privately and clears the form", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, submissionId: "id" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<StoryForm />);

    await user.type(
      screen.getByLabelText("Your message"),
      "This is a sufficiently detailed story about something I wish I had checked earlier.",
    );
    await user.click(screen.getByLabelText("I confirm that I am 18 or older."));
    await user.click(
      screen.getByLabelText(/I understand that this message is emailed/i),
    );
    await user.click(screen.getByRole("button", { name: "Send privately" }));

    expect(
      await screen.findByText(/delivered privately/i),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not require adult confirmation for a privacy request", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, submissionId: "id" }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<StoryForm />);

    await user.selectOptions(
      screen.getByLabelText("What would you like to share?"),
      "privacy",
    );
    expect(
      screen.queryByLabelText("I confirm that I am 18 or older."),
    ).not.toBeInTheDocument();
  });
});
