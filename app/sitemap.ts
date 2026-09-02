import type { MetadataRoute } from "next";

import { configuredSiteUrl, PRODUCTION_SITE_URL } from "@/lib/seo";

const INDEXABLE_PAGES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/how-it-works", changeFrequency: "monthly" as const, priority: 0.9 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/check-company", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/acceptable-use", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/privacy", changeFrequency: "monthly" as const, priority: 0.4 },
  { path: "/terms", changeFrequency: "monthly" as const, priority: 0.4 },
] as const;

function sitemapUrl(path: string): string {
  const base = configuredSiteUrl() ?? PRODUCTION_SITE_URL;
  const normalized = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`;
  return `${base}${normalized}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_PAGES.map((page) => ({
    url: sitemapUrl(page.path),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
