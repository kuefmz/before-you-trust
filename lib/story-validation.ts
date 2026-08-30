export type StoryTopic = "story" | "concern" | "privacy" | "other";

export interface StorySubmission {
  topic: StoryTopic;
  name?: string;
  email?: string;
  message: string;
  permissionToPublish: boolean;
  adultConfirmed: boolean;
  privacyAccepted: true;
  website?: string;
}

type ValidationResult =
  | { ok: true; data: StorySubmission }
  | { ok: false; error: string };

const TOPICS = new Set<StoryTopic>(["story", "concern", "privacy", "other"]);

function text(
  value: unknown,
  field: string,
  max: number,
  required = false,
): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`${field} is required.`);
    return undefined;
  }
  if (typeof value !== "string") throw new Error(`${field} must be text.`);
  const cleaned = value.replace(/\r\n/g, "\n").trim();
  if (required && cleaned.length < 2) {
    throw new Error(`${field} is too short.`);
  }
  if (cleaned.length > max) throw new Error(`${field} is too long.`);
  return cleaned || undefined;
}

export function validateStorySubmission(payload: unknown): ValidationResult {
  try {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return { ok: false, error: "Submission must be a JSON object." };
    }

    const record = payload as Record<string, unknown>;
    if (typeof record.topic !== "string" || !TOPICS.has(record.topic as StoryTopic)) {
      return { ok: false, error: "Please choose a valid topic." };
    }

    const topic = record.topic as StoryTopic;
    const website = text(record.website, "Website", 200);
    if (website) {
      return { ok: false, error: "Submission could not be accepted." };
    }

    const message = text(record.message, "Message", 7_000, true)!;
    if (message.length < 40) {
      return { ok: false, error: "Please add a little more detail (at least 40 characters)." };
    }

    const email = text(record.email, "Email", 240);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Please enter a valid email address." };
    }

    if (record.privacyAccepted !== true) {
      return {
        ok: false,
        error: "Please confirm that you understand how the submission is processed.",
      };
    }

    if (topic !== "privacy" && record.adultConfirmed !== true) {
      return {
        ok: false,
        error: "Story and concern submissions are available to adults only.",
      };
    }

    return {
      ok: true,
      data: {
        topic,
        name: text(record.name, "Name", 120),
        email,
        message,
        permissionToPublish: record.permissionToPublish === true,
        adultConfirmed: record.adultConfirmed === true,
        privacyAccepted: true,
        website: undefined,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid submission.",
    };
  }
}
