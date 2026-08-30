import { NextResponse } from "next/server";

import { EmailConfigurationError, sendTransactionalEmail } from "@/lib/email";
import { checkReportEmailRateLimit } from "@/lib/rate-limit";
import { renderReportEmail, validateReportEmailRequest } from "@/lib/report-email";
import { getRuntimeSetting } from "@/lib/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 75_000;

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent")?.slice(0, 80) ?? "unknown";
  return `${ip ?? "anonymous"}|${userAgent}`;
}

function response(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", "X-Robots-Tag": "noindex, nofollow" },
  });
}

export async function POST(request: Request) {
  const rate = checkReportEmailRateLimit(clientKey(request));
  if (!rate.allowed) return response(429, { error: { code: "RATE_LIMITED", message: "Too many report-email requests. Please try again later." } });

  let payload: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return response(413, { error: { code: "REQUEST_TOO_LARGE", message: "Report is too large." } });
    payload = JSON.parse(raw);
  } catch {
    return response(400, { error: { code: "INVALID_JSON", message: "Request must be valid JSON." } });
  }

  const validation = validateReportEmailRequest(payload);
  if (!validation.ok) return response(400, { error: { code: "INVALID_REQUEST", message: validation.error } });

  try {
    await sendTransactionalEmail({
      to: validation.data.email,
      subject: "Your Before You Trust report",
      text: renderReportEmail(validation.data),
      idempotencyKey: crypto.randomUUID(),
      tags: ["report-delivery"],
    });
  } catch (error) {
    if (error instanceof EmailConfigurationError) return response(503, { error: { code: "REPORT_EMAIL_NOT_CONFIGURED", message: "Email delivery is not configured yet." } });
    return response(502, { error: { code: "REPORT_EMAIL_FAILED", message: "The report could not be emailed. Please try again." } });
  }

  try {
    const operator = (await getRuntimeSetting("REPORT_REQUEST_NOTIFICATION_EMAIL")) || (await getRuntimeSetting("OWNER_NOTIFICATION_EMAIL"));
    if (operator) {
      await sendTransactionalEmail({
        to: operator,
        subject: "Before You Trust — report email requested",
        text: [
          "A visitor requested delivery of a Trust Brief.",
          "",
          `Delivery email: ${validation.data.email}`,
          `Source count: ${validation.data.results.length}`,
          "",
          "The searched person's name and report contents are intentionally omitted from this operator notification.",
          "Do not add this address to marketing without separate consent.",
        ].join("\n"),
        tags: ["report-request-notification"],
      });
    }
  } catch {
    console.error("Report-request operator notification could not be delivered.");
  }

  return response(200, { ok: true });
}