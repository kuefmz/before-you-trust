import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/how-it-works", "/privacy", "/acceptable-use"],
      disallow: ["/api/", "/report"],
    },
  };
}
