import type { MetadataRoute } from "next";

import { canonicalUrl, indexingEnabled } from "@/lib/seo";

const INDEXABLE_PAGES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/how-it-works", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/acceptable-use", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/privacy", changeFrequency: "monthly" as const, priority: 0.4 },
  { path: "/terms", changeFrequency: "monthly" as const, priority: 0.4 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexingEnabled()) return [];

  return INDEXABLE_PAGES.flatMap((page) => {
    const url = canonicalUrl(page.path);
    return url
      ? [
          {
            url,
            changeFrequency: page.changeFrequency,
            priority: page.priority,
          },
        ]
      : [];
  });
}
