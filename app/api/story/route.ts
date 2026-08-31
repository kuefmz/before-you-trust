import { NextResponse } from "next/server";

import { checkStoryRateLimit } from "@/lib/rate-limit";
import { validateStorySubmission } from "@/lib/story-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 10_000;
const DEFAULT_STORY_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzSiEe3FT7x3SY-vnMGHb1goDlB8SAqvleIxzvtMHYVXOdJFKSTo-UxkN2uFq0mWU8o/exec";

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

  const submissionId = crypto.randomUUID();
  if (process.env.E2E_MOCK_EMAIL === "true") {
    return response(200, { ok: true, submissionId });
  }

  const item = validation.data;
  const endpoint =
    process.env.REPORT_APPS_SCRIPT_URL?.trim() ||
    DEFAULT_STORY_APPS_SCRIPT_URL;

  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain;q=0.9",
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        kind: "story",
        submissionId,
        topic: item.topic,
        name: item.name ?? "",
        email: item.email ?? "",
        message: item.message,
        permissionToPublish: item.permissionToPublish,
      }),
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return response(502, {
      error: {
        code: "STORY_DELIVERY_FAILED",
        message: "Your submission could not be delivered. Please try again.",
      },
    });
  }

  const upstreamText = await upstream.text();
  let upstreamPayload: { ok?: boolean; error?: string } = {};
  try {
    upstreamPayload = JSON.parse(upstreamText) as {
      ok?: boolean;
      error?: string;
    };
  } catch {
    // Google can return an HTML sign-in/access page for a misconfigured
    // Apps Script deployment. Surface a useful error below.
  }

  if (!upstream.ok || upstreamPayload.ok !== true) {
    const looksLikeGoogleAccessPage =
      /<html|accounts\.google\.com|sign in|authorization required/i.test(
        upstreamText,
      );

    return response(502, {
      error: {
        code: looksLikeGoogleAccessPage
          ? "STORY_APPS_SCRIPT_ACCESS"
          : "STORY_DELIVERY_FAILED",
        message: looksLikeGoogleAccessPage
          ? "The story-delivery service is not publicly reachable. Update the Apps Script web-app deployment and try again."
          : upstreamPayload.error ||
            `The story-delivery service returned an unexpected response (HTTP ${upstream.status}).`,
      },
    });
  }

  return response(200, { ok: true, submissionId });
}
