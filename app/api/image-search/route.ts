import { NextResponse } from "next/server";

import {
  ImageSearchConfigurationError,
  searchImageOnWeb,
} from "@/lib/image-search";
import { checkImageRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  const rate = checkImageRateLimit(clientKey(request));
  if (!rate.allowed) {
    return response(429, {
      error: { code: "RATE_LIMITED", message: "Too many photo searches. Please try again later." },
    });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return response(400, { error: { code: "INVALID_FORM", message: "Photo upload is invalid." } });
  }

  const file = formData.get("photo");
  const isUpload =
    file !== null &&
    typeof file === "object" &&
    "arrayBuffer" in file &&
    typeof file.arrayBuffer === "function" &&
    "size" in file &&
    typeof file.size === "number" &&
    "type" in file &&
    typeof file.type === "string";

  if (!isUpload) {
    return response(400, {
      error: { code: "PHOTO_REQUIRED", message: "Please choose a photo." },
    });
  }

  const photo = file as File;

  if (!ALLOWED_TYPES.has(photo.type)) {
    return response(415, {
      error: {
        code: "UNSUPPORTED_IMAGE",
        message: "Use a JPG, PNG or WebP image.",
      },
    });
  }

  if (photo.size <= 0 || photo.size > MAX_IMAGE_BYTES) {
    return response(413, {
      error: {
        code: "IMAGE_TOO_LARGE",
        message: "Photo must be 5 MB or smaller.",
      },
    });
  }

  try {
    const result = await searchImageOnWeb(
      new Uint8Array(await photo.arrayBuffer()),
    );
    return response(200, { requestId: crypto.randomUUID(), ...result });
  } catch (error) {
    if (error instanceof ImageSearchConfigurationError) {
      return response(503, { error: { code: "IMAGE_SEARCH_NOT_CONFIGURED", message: error.message } });
    }
    return response(502, {
      error: { code: "IMAGE_SEARCH_FAILED", message: "The photo could not be checked against public web images right now." },
    });
  }
}