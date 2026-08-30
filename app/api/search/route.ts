import { NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";
import { recordSearchOccurrence } from "@/lib/search-monitor";
import {
  executeSearch,
  SearchConfigurationError,
  SearchExecutionError,
} from "@/lib/search";
import { validateSearchRequest } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 12_000;

function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, max-age=0",
    Pragma: "no-cache",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent")?.slice(0, 80) ?? "unknown";
  return `${ip ?? "anonymous"}|${userAgent}`;
}

function rateLimitHeaders(result: ReturnType<typeof checkRateLimit>): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  extraHeaders: HeadersInit = {},
) {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: {
        ...noStoreHeaders(),
        ...extraHeaders,
      },
    },
  );
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(clientKey(request));
  const rateHeaders = rateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return errorResponse(
      429,
      "RATE_LIMITED",
      "Too many searches from this connection. Please try again later.",
      rateHeaders,
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return errorResponse(
      413,
      "REQUEST_TOO_LARGE",
      "Search request is too large.",
      rateHeaders,
    );
  }

  let payload: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return errorResponse(
        413,
        "REQUEST_TOO_LARGE",
        "Search request is too large.",
        rateHeaders,
      );
    }
    payload = JSON.parse(rawBody);
  } catch {
    return errorResponse(
      400,
      "INVALID_JSON",
      "Request body must be valid JSON.",
      rateHeaders,
    );
  }

  const validation = validateSearchRequest(payload);
  if (!validation.ok) {
    return errorResponse(400, "INVALID_REQUEST", validation.error, rateHeaders);
  }

  // Privacy-preserving repeat detection. The raw name is never written to the
  // signal table. Monitoring failure must not block the search itself.
  if (validation.data.mode === "identity") {
    try {
      await recordSearchOccurrence(validation.data.name);
    } catch {
      console.error("Repeat-search monitoring is unavailable.");
    }
  }

  try {
    const result = await executeSearch(validation.data, request.signal);
    return NextResponse.json(
      {
        requestId: crypto.randomUUID(),
        ...result,
      },
      {
        headers: {
          ...noStoreHeaders(),
          ...rateHeaders,
        },
      },
    );
  } catch (error) {
    if (error instanceof SearchConfigurationError) {
      return errorResponse(
        503,
        "SEARCH_NOT_CONFIGURED",
        error.message,
        rateHeaders,
      );
    }

    if (error instanceof SearchExecutionError) {
      return errorResponse(502, "SEARCH_FAILED", error.message, rateHeaders);
    }

    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "The search could not be completed.",
      rateHeaders,
    );
  }
}
