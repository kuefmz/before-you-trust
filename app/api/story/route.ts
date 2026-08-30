import { NextResponse } from "next/server";

import {
  EmailConfigurationError,
  sendTransactionalEmail,
} from "@/lib/email";
import { checkStoryRateLimit } from "@/lib/rate-limit";
import { validateStorySubmission } from "@/lib/story-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 10_000;

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent")?.slice(0, 80) ?? "unknown";
  return `${ip ?? "anonymous"}|${userAgent}`;
}

function headers() {
  return {
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

function response(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: headers() });
}

export async function POST(request: Request) {
  const rate = checkStoryRateLimit(clientKey(request));
  if (!rate.allowed) {
    return response(429, {
      error: {
        code: "RATE_LIMITED",
        message: "Too many submissions. Please try again later.",
      },
    });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return response(413, {
      error: { code: "REQUEST_TOO_LARGE", message: "Submission is too large." },
    });
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return response(413, {
        error: { code: "REQUEST_TOO_LARGE", message: "Submission is too large." },
      });
    }
    payload = JSON.parse(raw);
  } catch {
    return response(400, {
      error: { code: "INVALID_JSON", message: "Submission must be valid JSON." },
    });
  }

  const validation = validateStorySubmission(payload);
  if (!validation.ok) {
    return response(400, {
      error: { code: "INVALID_SUBMISSION", message: validation.error },
    });
  }

  const to = process.env.OWNER_NOTIFICATION_EMAIL?.trim();
  if (!to) {
    return response(503, {
      error: {
        code: "STORY_EMAIL_NOT_CONFIGURED",
        message: "Story submissions are not configured yet.",
      },
    });
  }

  const submissionId = crypto.randomUUID();
  const item = validation.data;
  const topicLabel = {
    story: "Story",
    concern: "Concern / feedback",
    privacy: "Privacy / data request",
    other: "Other",
  }[item.topic];

  try {
    await sendTransactionalEmail({
      to,
      replyTo: item.email,
      subject: `Before You Trust — ${topicLabel} submission`,
      text: [
        `Submission ID: ${submissionId}`,
        `Topic: ${topicLabel}`,
        `Name provided: ${item.name || "No"}`,
        `Reply email provided: ${item.email || "No"}`,
        `Permission to publish an anonymized excerpt: ${item.permissionToPublish ? "Yes" : "No"}`,
        "",
        "Message:",
        item.message,
        "",
        "Privacy note: this submission is not stored in the application database. It is delivered to the configured mailbox via the transactional email provider.",
      ].join("\n"),
      idempotencyKey: submissionId,
      tags: ["story-submission", item.topic],
    });
  } catch (error) {
    if (error instanceof EmailConfigurationError) {
      return response(503, {
        error: {
          code: "STORY_EMAIL_NOT_CONFIGURED",
          message: "Story submissions are not configured yet.",
        },
      });
    }
    return response(502, {
      error: {
        code: "EMAIL_DELIVERY_FAILED",
        message: "Your submission could not be delivered. Please try again.",
      },
    });
  }

  return response(200, { ok: true, submissionId });
}
