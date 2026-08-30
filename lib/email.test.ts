import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EmailConfigurationError,
  sendTransactionalEmail,
} from "@/lib/email";

const original = { ...process.env };

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...original };
});

describe("sendTransactionalEmail", () => {
  it("uses a gated mock only outside production", async () => {
    process.env.E2E_MOCK_EMAIL = "true";
    process.env.NODE_ENV = "test";

    await expect(
      sendTransactionalEmail({
        to: "owner@example.com",
        subject: "Test",
        text: "Hello",
      }),
    ).resolves.toEqual({ messageId: "mock-message-id" });
  });

  it("sends plain text through Brevo with reply-to", async () => {
    process.env.E2E_MOCK_EMAIL = "false";
    process.env.BREVO_API_KEY = "key";
    process.env.BREVO_FROM_EMAIL = "sender@example.com";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messageId: "brevo-id" }), { status: 201 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendTransactionalEmail({
      to: "owner@example.com",
      subject: "Story",
      text: "Private story",
      replyTo: "visitor@example.com",
      idempotencyKey: "abc",
      tags: ["story-submission"],
    });

    expect(result.messageId).toBe("brevo-id");
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body));
    expect(body.textContent).toBe("Private story");
    expect(body.replyTo.email).toBe("visitor@example.com");
    expect(body.headers["Idempotency-Key"]).toBe("abc");
  });

  it("fails closed when email config is absent", async () => {
    process.env.E2E_MOCK_EMAIL = "false";
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_FROM_EMAIL;

    await expect(
      sendTransactionalEmail({
        to: "owner@example.com",
        subject: "Test",
        text: "Hello",
      }),
    ).rejects.toBeInstanceOf(EmailConfigurationError);
  });
});
