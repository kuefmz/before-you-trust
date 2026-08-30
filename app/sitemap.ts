import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.invalid").replace(
    /\/+$/,
    "",
  );

  return [
    "",
    "/how-it-works",
    "/about",
    "/share-your-story",
    "/privacy",
    "/terms",
    "/acceptable-use",
  ].map((path) => ({
    url: `${base}${path || "/"}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/about" ? 0.8 : 0.6,
  }));
}
