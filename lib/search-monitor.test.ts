import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  email: vi.fn(),
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {
    send = mocks.send;
  },
  UpdateItemCommand: class {
    constructor(public input: unknown) {}
  },
}));

vi.mock("@/lib/email", () => ({
  sendTransactionalEmail: mocks.email,
}));

import {
  fingerprintSearchName,
  normalizeSearchName,
  recordSearchOccurrence,
  shouldSendRepeatAlert,
} from "@/lib/search-monitor";

const original = { ...process.env };

beforeEach(() => {
  mocks.send.mockReset();
  mocks.email.mockReset();
});

afterEach(() => {
  process.env = { ...original };
});

describe("privacy-preserving repeat-search monitoring", () => {
  it("normalizes equivalent names and creates deterministic keyed fingerprints", () => {
    expect(normalizeSearchName("  Jane   Smith ")).toBe("jane smith");
    expect(
      fingerprintSearchName("Jane Smith", "a".repeat(32)),
    ).toBe(
      fingerprintSearchName(" jane  smith ", "a".repeat(32)),
    );
    expect(
      fingerprintSearchName("Jane Smith", "a".repeat(32)),
    ).not.toBe(fingerprintSearchName("Jane Smith", "b".repeat(32)));
  });

  it("alerts at threshold and exponential multiples only", () => {
    expect(shouldSendRepeatAlert(2, 3)).toBe(false);
    expect(shouldSendRepeatAlert(3, 3)).toBe(true);
    expect(shouldSendRepeatAlert(6, 3)).toBe(true);
    expect(shouldSendRepeatAlert(9, 3)).toBe(false);
    expect(shouldSendRepeatAlert(12, 3)).toBe(true);
  });

  it("is disabled when no persistent signal table is configured", async () => {
    delete process.env.SEARCH_SIGNAL_TABLE;
    delete process.env.SEARCH_FINGERPRINT_SECRET;

    await expect(recordSearchOccurrence("Jane Smith")).resolves.toEqual({
      enabled: false,
    });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("stores only a fingerprint and sends a pseudonymous threshold alert", async () => {
    process.env.SEARCH_SIGNAL_TABLE = "signals";
    process.env.SEARCH_FINGERPRINT_SECRET = "s".repeat(48);
    process.env.REPEAT_SEARCH_ALERT_THRESHOLD = "3";
    process.env.REPEAT_ALERT_EMAIL_TO = "owner@example.com";
    process.env.REPEAT_ALERT_INCLUDE_NAME = "false";

    mocks.send.mockResolvedValue({
      Attributes: { count: { N: "3" } },
    });
    mocks.email.mockResolvedValue({ messageId: "id" });

    const result = await recordSearchOccurrence("Jane Smith");

    expect(result).toEqual({ enabled: true, count: 3, alerted: true });
    const command = mocks.send.mock.calls[0]![0] as { input: Record<string, unknown> };
    expect(JSON.stringify(command.input)).not.toContain("Jane Smith");

    const email = mocks.email.mock.calls[0]![0] as { text: string };
    expect(email.text).not.toContain("Jane Smith");
    expect(email.text).toContain("Pseudonymous subject key");
  });
});
