import { afterEach, describe, expect, it } from "vitest";

import {
  canonicalUrl,
  configuredSiteUrl,
  indexingEnabled,
  pageMetadata,
} from "@/lib/seo";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalAllowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING;

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }

  if (originalAllowIndexing === undefined) {
    delete process.env.NEXT_PUBLIC_ALLOW_INDEXING;
  } else {
    process.env.NEXT_PUBLIC_ALLOW_INDEXING = originalAllowIndexing;
  }
});

describe("SEO helpers", () => {
  it("keeps indexing off unless the canonical site and explicit flag are set", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_ALLOW_INDEXING = "true";
    expect(indexingEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_SITE_URL = "https://example.org";
    process.env.NEXT_PUBLIC_ALLOW_INDEXING = "false";
    expect(indexingEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_ALLOW_INDEXING = "true";
    expect(indexingEnabled()).toBe(true);
  });

  it("normalizes canonical site URLs", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.org/";
    expect(configuredSiteUrl()).toBe("https://example.org");
    expect(canonicalUrl("/about")).toBe("https://example.org/about");
    expect(canonicalUrl("/")).toBe("https://example.org/");
  });

  it("emits noindex metadata on staging", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.example.org";
    process.env.NEXT_PUBLIC_ALLOW_INDEXING = "false";

    const metadata = pageMetadata({
      title: "About",
      description: "Example",
      path: "/about",
    });

    expect(metadata.alternates).toEqual({
      canonical: "https://staging.example.org/about",
    });
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
});
