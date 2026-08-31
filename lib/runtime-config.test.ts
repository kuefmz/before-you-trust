import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("@aws-sdk/client-ssm", () => ({
  SSMClient: class {
    send = mocks.send;
  },
  GetParameterCommand: class {
    constructor(public input: unknown) {}
  },
}));

import {
  getRuntimeSetting,
  resetRuntimeConfigForTests,
} from "@/lib/runtime-config";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
  mocks.send.mockReset();
  resetRuntimeConfigForTests();
});

describe("runtime configuration", () => {
  it("prefers direct local environment values", async () => {
    process.env.YACY_PASSWORD = "local-password";
    process.env.RUNTIME_SECRETS_PARAMETER = "/runtime";
    mocks.send.mockRejectedValue(new Error("should not be called"));

    await expect(getRuntimeSetting("YACY_PASSWORD")).resolves.toBe("local-password");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("loads and caches encrypted runtime JSON through SSM", async () => {
    delete process.env.YACY_PASSWORD;
    process.env.RUNTIME_SECRETS_PARAMETER = "/before-you-trust/dev/runtime";
    mocks.send.mockResolvedValue({
      Parameter: {
        Value: JSON.stringify({
          YACY_PASSWORD: "secure-password",
          SEARCH_FINGERPRINT_SECRET: "x".repeat(48),
        }),
      },
    });

    await expect(getRuntimeSetting("YACY_PASSWORD")).resolves.toBe("secure-password");
    await expect(getRuntimeSetting("SEARCH_FINGERPRINT_SECRET")).resolves.toBe(
      "x".repeat(48),
    );
    expect(mocks.send).toHaveBeenCalledTimes(1);
    const command = mocks.send.mock.calls[0]![0] as { input: Record<string, unknown> };
    expect(command.input).toEqual({
      Name: "/before-you-trust/dev/runtime",
      WithDecryption: true,
    });
  });

  it("returns undefined when neither local nor SSM config exists", async () => {
    delete process.env.RUNTIME_SECRETS_PARAMETER;
    delete process.env.YACY_USERNAME;
    await expect(getRuntimeSetting("YACY_USERNAME")).resolves.toBeUndefined();
  });
});
