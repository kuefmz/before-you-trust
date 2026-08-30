import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EmailReportForm } from "@/components/EmailReportForm";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("EmailReportForm", () => {
  it("requires acknowledgement and submits without analytics PII", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EmailReportForm
        reportLabel="Example Person"
        results={[{
          title: "Public profile",
          url: "https://example.org/person",
          snippet: "Public source",
          sourceType: "professional",
          publishedAt: null,
          providers: ["test"],
          queries: ["Example Person"],
          queryKinds: ["identity"],
        }]}
      />,
    );

    await user.type(screen.getByLabelText("Email address"), "reader@example.com");
    await user.click(screen.getByLabelText(/I understand my email is used/i));
    await user.click(screen.getByRole("button", { name: "Email me the report" }));
    expect(await screen.findByText(/Check your inbox/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});