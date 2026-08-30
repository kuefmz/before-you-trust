import { beforeEach, describe, expect, it } from "vitest";

import {
  checkRateLimit,
  resetRateLimitForTests,
} from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimitForTests();
});

describe("rate limiter", () => {
  it("allows requests below the limit", () => {
    const first = checkRateLimit("client", 1_000);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(19);
  });

  it("blocks the twenty-first request in a window", () => {
    let result = checkRateLimit("client", 1_000);
    for (let index = 1; index < 21; index += 1) {
      result = checkRateLimit("client", 1_000);
    }
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resets after the time window", () => {
    const first = checkRateLimit("client", 1_000);
    const reset = checkRateLimit("client", first.resetAt + 1);
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(19);
  });
});
