import { categorizeSource, normalizeUrl } from "@/lib/normalize";
import { getRuntimeSetting } from "@/lib/runtime-config";
import type { ImageSearchResponse, SearchResult } from "@/types/search";

export class ImageSearchConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageSearchConfigurationError";
  }
}

interface VisionWebDetection {
  bestGuessLabels?: Array<{ label?: string }>;
  pagesWithMatchingImages?: Array<{ url?: string; pageTitle?: string }>;
  fullMatchingImages?: Array<{ url?: string }>;
  partialMatchingImages?: Array<{ url?: string }>;
  visuallySimilarImages?: Array<{ url?: string }>;
}

function mockResponse(): Omit<ImageSearchResponse, "requestId"> {
  return {
    provider: "mock-image",
    bestGuessLabels: ["example person"],
    exactImageMatches: 2,
    partialImageMatches: 1,
    visuallySimilarImages: 4,
    matches: [
      {
        title: "Public social profile containing a matching image",
        url: "https://www.instagram.com/example-person/",
        snippet: "Example-only image-search fixture representing a public page with a matching image.",
        sourceType: "social",
        publishedAt: null,
        providers: ["mock-image"],
        queries: ["uploaded photo"],
        queryKinds: ["image"],
      },
      {
        title: "Public professional page containing a matching image",
        url: "https://www.linkedin.com/in/example-person/",
        snippet: "Example-only image-search fixture representing a public professional page with a matching image.",
        sourceType: "professional",
        publishedAt: null,
        providers: ["mock-image"],
        queries: ["uploaded photo"],
        queryKinds: ["image"],
      },
    ],
    warnings: [],
  };
}

export async function searchImageOnWeb(
  bytes: Uint8Array,
): Promise<Omit<ImageSearchResponse, "requestId">> {
  if (
    process.env.E2E_MOCK_IMAGE_SEARCH === "true" &&
    process.env.CI === "true"
  ) {
    return mockResponse();
  }

  let apiKey: string | undefined;
  try {
    apiKey = await getRuntimeSetting("GOOGLE_VISION_API_KEY");
  } catch {
    throw new ImageSearchConfigurationError(
      "Secure image-search configuration could not be loaded.",
    );
  }

  if (!apiKey) {
    throw new ImageSearchConfigurationError("Photo web matching is not configured yet.");
  }

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: Buffer.from(bytes).toString("base64") },
            features: [{ type: "WEB_DETECTION", maxResults: 12 }],
          },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Google Vision returned status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    responses?: Array<{
      webDetection?: VisionWebDetection;
      error?: { message?: string };
    }>;
  };

  const first = payload.responses?.[0];
  if (first?.error?.message) throw new Error(first.error.message);

  const web = first?.webDetection;
  if (!web) {
    return {
      provider: "google-vision",
      bestGuessLabels: [],
      exactImageMatches: 0,
      partialImageMatches: 0,
      visuallySimilarImages: 0,
      matches: [],
      warnings: ["No public web-image matches were returned."],
    };
  }

  const seen = new Set<string>();
  const matches: SearchResult[] = [];
  for (const page of web.pagesWithMatchingImages ?? []) {
    if (!page.url) continue;
    const url = normalizeUrl(page.url);
    if (seen.has(url)) continue;
    seen.add(url);
    matches.push({
      title: page.pageTitle?.trim() || "Page containing a matching image",
      url,
      snippet: "Google Vision Web Detection found this public webpage in connection with the uploaded image. Review the page to confirm identity.",
      sourceType: categorizeSource(url),
      publishedAt: null,
      providers: ["google-vision"],
      queries: ["uploaded photo"],
      queryKinds: ["image"],
    });
  }

  return {
    provider: "google-vision",
    bestGuessLabels: (web.bestGuessLabels ?? [])
      .map((item) => item.label?.trim())
      .filter((label): label is string => Boolean(label))
      .slice(0, 5),
    exactImageMatches: web.fullMatchingImages?.length ?? 0,
    partialImageMatches: web.partialMatchingImages?.length ?? 0,
    visuallySimilarImages: web.visuallySimilarImages?.length ?? 0,
    matches: matches.slice(0, 20),
    warnings: [],
  };
}