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
    process.env.TAVILY_API_KEY = "local-key";
    process.env.RUNTIME_SECRETS_PARAMETER = "/runtime";
    mocks.send.mockRejectedValue(new Error("should not be called"));

    await expect(getRuntimeSetting("TAVILY_API_KEY")).resolves.toBe("local-key");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("loads and caches encrypted runtime JSON through SSM", async () => {
    delete process.env.TAVILY_API_KEY;
    process.env.RUNTIME_SECRETS_PARAMETER = "/before-you-trust/dev/runtime";
    mocks.send.mockResolvedValue({
      Parameter: {
        Value: JSON.stringify({
          TAVILY_API_KEY: "secure-key",
          SEARCH_FINGERPRINT_SECRET: "x".repeat(48),
        }),
      },
    });

    await expect(getRuntimeSetting("TAVILY_API_KEY")).resolves.toBe("secure-key");
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
    delete process.env.BRAVE_SEARCH_API_KEY;
    await expect(getRuntimeSetting("BRAVE_SEARCH_API_KEY")).resolves.toBeUndefined();
  });
});
