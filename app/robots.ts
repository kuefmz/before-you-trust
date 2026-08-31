import type { MetadataRoute } from "next";

import {
  canonicalUrl,
  configuredSiteUrl,
  indexingEnabled,
} from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const base = configuredSiteUrl();
  const canIndex = indexingEnabled();

  return {
    rules: canIndex
      ? {
          userAgent: "*",
          allow: "/",
          disallow: ["/api/", "/_next/", "/report"],
        }
      : {
          userAgent: "*",
          disallow: "/",
        },
    sitemap: canIndex ? canonicalUrl("/sitemap.xml") : undefined,
    host: canIndex ? base : undefined,
  };
}
