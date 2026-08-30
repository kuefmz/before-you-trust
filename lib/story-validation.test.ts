import { describe, expect, it } from "vitest";

import { validateStorySubmission } from "@/lib/story-validation";

describe("validateStorySubmission", () => {
  it("accepts a valid adult story submission", () => {
    const result = validateStorySubmission({
      topic: "story",
      name: "Jane",
      email: "jane@example.com",
      message:
        "This is a sufficiently detailed story about what I wish I had checked earlier.",
      permissionToPublish: false,
      adultConfirmed: true,
      privacyAccepted: true,
      website: "",
    });

    expect(result.ok).toBe(true);
  });

  it("allows privacy requests without adult confirmation", () => {
    const result = validateStorySubmission({
      topic: "privacy",
      message:
        "Please help me understand or remove data associated with this exact searched name.",
      adultConfirmed: false,
      privacyAccepted: true,
    });

    expect(result.ok).toBe(true);
  });

  it("rejects bot honeypot content", () => {
    const result = validateStorySubmission({
      topic: "story",
      message:
        "This looks like a real message but a bot also completed the hidden website field.",
      website: "https://spam.example",
      adultConfirmed: true,
      privacyAccepted: true,
    });

    expect(result.ok).toBe(false);
  });

  it("rejects invalid email addresses", () => {
    const result = validateStorySubmission({
      topic: "story",
      message:
        "This is a sufficiently detailed story but the contact address is invalid.",
      email: "not-an-email",
      adultConfirmed: true,
      privacyAccepted: true,
    });

    expect(result.ok).toBe(false);
  });

  it("requires privacy acknowledgement", () => {
    const result = validateStorySubmission({
      topic: "story",
      message:
        "This is a sufficiently detailed story but privacy acknowledgement is missing.",
      adultConfirmed: true,
      privacyAccepted: false,
    });

    expect(result.ok).toBe(false);
  });
});
