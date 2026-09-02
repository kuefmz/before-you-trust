import { afterEach, beforeEach, describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const originalAllowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://beforeyoutrust.org";
  process.env.NEXT_PUBLIC_ALLOW_INDEXING = "false";
});

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

describe("crawl discovery routes", () => {
  it("keeps the sitemap populated even when indexing is disabled", () => {
    const entries = sitemap();

    expect(entries).toHaveLength(7);
    expect(entries.map((entry) => entry.url)).toEqual([
      "https://beforeyoutrust.org/",
      "https://beforeyoutrust.org/how-it-works",
      "https://beforeyoutrust.org/about",
      "https://beforeyoutrust.org/check-company",
      "https://beforeyoutrust.org/acceptable-use",
      "https://beforeyoutrust.org/privacy",
      "https://beforeyoutrust.org/terms",
    ]);
  });

  it("keeps the sitemap populated in local development without a site-url env var", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    const entries = sitemap();

    expect(entries).toHaveLength(7);
    expect(entries[0]?.url).toBe("https://beforeyoutrust.org/");
  });

  it("keeps sitemap discovery in robots while staging remains blocked", () => {
    expect(robots()).toMatchObject({
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: "https://beforeyoutrust.org/sitemap.xml",
      host: "https://beforeyoutrust.org",
    });
  });

  it("allows public pages and blocks private endpoints when indexing is enabled", () => {
    process.env.NEXT_PUBLIC_ALLOW_INDEXING = "true";

    expect(robots()).toMatchObject({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/report"],
      },
      sitemap: "https://beforeyoutrust.org/sitemap.xml",
    });
  });
});
