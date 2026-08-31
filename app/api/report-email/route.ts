import { NextResponse } from "next/server";

import { checkReportEmailRateLimit } from "@/lib/rate-limit";
import {
  buildAppsScriptPayload,
  validateReportEmailRequest,
} from "@/lib/report-email";
import { getRuntimeSetting } from "@/lib/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The validated request can contain up to 70 filtered sources. With titles,
 // URLs and snippets, 75 KB was too small for legitimate Trust Briefs and
 // caused delivery to fail before Apps Script was contacted.
const MAX_BODY_BYTES = 300_000;
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

  // REPORT_APPS_SCRIPT_URL is intentionally non-secret. Prefer the local/runtime
  // environment value, but do not make delivery depend on optional SSM access.
  // The default is the deployed Before You Trust Apps Script web app.
  let endpoint =
    process.env.REPORT_APPS_SCRIPT_URL?.trim() ||
    DEFAULT_REPORT_APPS_SCRIPT_URL;

  try {
    const runtimeEndpoint = await getRuntimeSetting("REPORT_APPS_SCRIPT_URL");
    if (runtimeEndpoint) endpoint = runtimeEndpoint;
  } catch {
    // Ignore optional runtime-secret loading failures for this public endpoint.
  }

  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json, text/plain;q=0.9",
        // Apps Script's doPost reads e.postData.contents either way. text/plain
        // avoids unnecessary content-type handling while preserving JSON bytes.
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(buildAppsScriptPayload(validation.data)),
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return response(502, {
      error: {
        code: "REPORT_EMAIL_FAILED",
        message: "The report service could not be reached. Please try again.",
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
    // Google may return an HTML sign-in/access page when the web-app deployment
    // is not available to anonymous callers. Surface that explicitly.
  }

  if (!upstream.ok || upstreamPayload.ok !== true) {
    const looksLikeGoogleAccessPage =
      /<html|accounts\.google\.com|sign in|authorization required/i.test(
        upstreamText,
      );

    return response(502, {
      error: {
        code: looksLikeGoogleAccessPage
          ? "REPORT_APPS_SCRIPT_ACCESS"
          : "REPORT_EMAIL_FAILED",
        message: looksLikeGoogleAccessPage
          ? "The Google Apps Script web app is not accessible to the report service. Redeploy it as a Web app that executes as you and allows access to Anyone."
          : upstreamPayload.error ||
            `The report service returned an unexpected response (HTTP ${upstream.status}).`,
      },
    });
  }

  return response(200, { ok: true });
}
