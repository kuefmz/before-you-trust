import { createHmac } from "node:crypto";

import {
  DynamoDBClient,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

import { sendTransactionalEmail } from "@/lib/email";

export interface SearchSignalResult {
  enabled: boolean;
  count?: number;
  alerted?: boolean;
}

let dynamoClient: DynamoDBClient | undefined;

function client(): DynamoDBClient {
  dynamoClient ??= new DynamoDBClient({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "eu-central-1",
  });
  return dynamoClient;
}

export function normalizeSearchName(name: string): string {
  return name
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/\s+/g, " ")
    .trim();
}

export function fingerprintSearchName(name: string, secret: string): string {
  const normalized = normalizeSearchName(name);
  return createHmac("sha256", secret).update(normalized, "utf8").digest("hex");
}

export function shouldSendRepeatAlert(count: number, threshold: number): boolean {
  if (threshold < 2 || count < threshold || count % threshold !== 0) return false;
  const multiplier = count / threshold;
  return Number.isInteger(multiplier) && (multiplier & (multiplier - 1)) === 0;
}

function boundedInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export async function recordSearchOccurrence(name: string): Promise<SearchSignalResult> {
  const tableName = process.env.SEARCH_SIGNAL_TABLE?.trim();
  const secret = process.env.SEARCH_FINGERPRINT_SECRET?.trim();

  if (!tableName || !secret) return { enabled: false };

  if (secret.length < 32) {
    throw new Error("SEARCH_FINGERPRINT_SECRET must be at least 32 characters.");
  }

  const subjectKey = fingerprintSearchName(name, secret);
  const now = new Date();
  const nowIso = now.toISOString();
  const ttlDays = boundedInt(process.env.SEARCH_SIGNAL_TTL_DAYS, 30, 1, 365);
  const expiresAt = Math.floor(now.getTime() / 1000) + ttlDays * 86_400;

  const response = await client().send(
    new UpdateItemCommand({
      TableName: tableName,
      Key: { subjectKey: { S: subjectKey } },
      UpdateExpression:
        "SET #count = if_not_exists(#count, :zero) + :one, firstSeen = if_not_exists(firstSeen, :now), lastSeen = :now, expiresAt = :ttl, dataVersion = :version",
      ExpressionAttributeNames: { "#count": "count" },
      ExpressionAttributeValues: {
        ":zero": { N: "0" },
        ":one": { N: "1" },
        ":now": { S: nowIso },
        ":ttl": { N: String(expiresAt) },
        ":version": { S: "v1" },
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  const count = Number.parseInt(response.Attributes?.count?.N ?? "1", 10);
  const threshold = boundedInt(
    process.env.REPEAT_SEARCH_ALERT_THRESHOLD,
    3,
    2,
    100,
  );

  if (!shouldSendRepeatAlert(count, threshold)) {
    return { enabled: true, count, alerted: false };
  }

  const recipient =
    process.env.REPEAT_ALERT_EMAIL_TO?.trim() ||
    process.env.OWNER_NOTIFICATION_EMAIL?.trim();

  if (!recipient) {
    return { enabled: true, count, alerted: false };
  }

  const includeName = process.env.REPEAT_ALERT_INCLUDE_NAME === "true";
  const subjectDescription = includeName
    ? `Searched name: ${name}`
    : `Pseudonymous subject key: ${subjectKey.slice(0, 16)}…`;

  await sendTransactionalEmail({
    to: recipient,
    subject: `Before You Trust: repeat-search signal (${count} searches)`,
    text: [
      "A repeated-search threshold was reached.",
      "",
      subjectDescription,
      `Count in the current retention window: ${count}`,
      `Retention window: up to ${ttlDays} day(s) from the most recent search.`,
      "",
      includeName
        ? "Privacy note: raw-name alerts are enabled, so this name is now present in this email/mailbox."
        : "Privacy note: the raw searched name is not stored in the signal table or included in this alert.",
      "",
      "This signal is not evidence that the searched person did anything wrong. It only means the same normalized name was searched repeatedly.",
    ].join("\n"),
    idempotencyKey: `repeat-${subjectKey}-${count}`,
    tags: ["repeat-search-signal"],
  });

  return { enabled: true, count, alerted: true };
}
