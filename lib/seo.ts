import type { Metadata } from "next";

export const SITE_NAME = "Before You Trust";
export const SITE_DESCRIPTION =
  "Research a person's public web footprint, confirm the right identity, verify claims, and review original sources before placing meaningful trust.";

export function configuredSiteUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return undefined;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}

export function indexingEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true" &&
    Boolean(configuredSiteUrl())
  );
}

export function canonicalUrl(path = "/"): string | undefined {
  const base = configuredSiteUrl();
  if (!base) return undefined;
  const normalized = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`;
  return `${base}${normalized}`;
}

export function pageMetadata({
  title,
  description,
  path,
  index = true,
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  const canonical = canonicalUrl(path);
  const shouldIndex = index && indexingEnabled();

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots: {
      index: shouldIndex,
      follow: shouldIndex,
      googleBot: {
        index: shouldIndex,
        follow: shouldIndex,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      siteName: SITE_NAME,
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
