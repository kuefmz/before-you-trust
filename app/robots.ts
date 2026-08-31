import type { MetadataRoute } from "next";

import {
  canonicalUrl,
  configuredSiteUrl,
  indexingEnabled,
} from "@/lib/seo";

const PRIVATE_PATHS = ["/api/", "/report"];

export default function robots(): MetadataRoute.Robots {
  const base = configuredSiteUrl();
  const canIndex = indexingEnabled();

  if (!canIndex) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PATHS,
    },
    sitemap: canonicalUrl("/sitemap.xml"),
    host: base,
  };
}
