import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return [];

  const base = configured.replace(/\/+$/, "");
  const paths = [
    "",
    "/how-it-works",
    "/about",
    "/share-your-story",
    "/privacy",
    "/terms",
    "/acceptable-use",
  ];

  return paths.map((path) => ({
    url: `${base}${path || "/"}`,
    changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
    priority: path === "" ? 1 : path === "/about" ? 0.8 : 0.6,
  }));
}
