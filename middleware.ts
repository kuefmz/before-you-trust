import { NextRequest, NextResponse } from "next/server";

const allowedOrigins = new Set([
  "https://beforeyoutrust.org",
  "https://www.beforeyoutrust.org",
]);

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = Boolean(origin && allowedOrigins.has(origin));
  const headers = new Headers();
  headers.set("Vary", "Origin");
  if (allowed && origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "600");
  }
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: allowed ? 204 : 403, headers });
  }
  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = { matcher: "/api/:path*" };
