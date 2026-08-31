import { NextResponse } from "next/server";

import { checkReportEmailRateLimit } from "@/lib/rate-limit";
import {
  buildAppsScriptPayload,
  validateReportEmailRequest,
} from "@/lib/report-email";
import { getRuntimeSetting } from "@/lib/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 75_000;
const DEFAULT_REPORT_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxe1s2hTRDF3m37UDcEHCj8Feb5iEDwjM82ZXizQ1sOgdZvJdNvkLbJsYi3FCJHA7Ml/exec";

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent")?.slice(0, 80) ?? "unknown";
  return `${ip ?? "anonymous"}|${userAgent}`;
}

function response(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function POST(request: Request) {
  const rate = checkReportEmailRateLimit(clientKey(request));
  if (!rate.allowed) {
    return response(429, {
      error: {
        code: "RATE_LIMITED",
        message: "Too many report-email requests. Please try again later.",
      },
    });
  }

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return response(413, {
        error: { code: "REQUEST_TOO_LARGE", message: "Report is too large." },
      });
    }
    payload = JSON.parse(raw);
  } catch {
    return response(400, {
      error: { code: "INVALID_JSON", message: "Request must be valid JSON." },
    });
  }

  const validation = validateReportEmailRequest(payload);
  if (!validation.ok) {
    return response(400, {
      error: { code: "INVALID_REQUEST", message: validation.error },
    });
  }

  if (process.env.E2E_MOCK_EMAIL === "true") {
    return response(200, { ok: true });
  }

  let endpoint: string;
  try {
    endpoint =
      (await getRuntimeSetting("REPORT_APPS_SCRIPT_URL")) ??
      DEFAULT_REPORT_APPS_SCRIPT_URL;
  } catch {
    return response(503, {
      error: {
        code: "REPORT_EMAIL_NOT_CONFIGURED",
        message: "Report delivery configuration could not be loaded.",
      },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildAppsScriptPayload(validation.data)),
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return response(502, {
      error: {
        code: "REPORT_EMAIL_FAILED",
        message: "The report service could not be reached. Please try again.",
      },
    });
  }

  let upstreamPayload: { ok?: boolean; error?: string } = {};
  try {
    upstreamPayload = (await upstream.json()) as {
      ok?: boolean;
      error?: string;
    };
  } catch {
    // Treat a non-JSON response as an upstream failure.
  }

  if (!upstream.ok || upstreamPayload.ok !== true) {
    return response(502, {
      error: {
        code: "REPORT_EMAIL_FAILED",
        message:
          upstreamPayload.error === "Unauthorized"
            ? "Report delivery is not configured correctly."
            : "The report could not be emailed. Please try again.",
      },
    });
  }

  return response(200, { ok: true });
}
