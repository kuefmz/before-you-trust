import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const analyticsEnabled = Boolean(
  process.env.NEXT_PUBLIC_GTM_ID?.trim() ||
    process.env.NEXT_PUBLIC_GA4_ID?.trim() ||
    "GTM-TPGSP8XN",
);

const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ...(analyticsEnabled ? ["https://www.googletagmanager.com"] : []),
];

const connectSources = [
  "'self'",
  ...(analyticsEnabled
    ? ["https://www.google-analytics.com", "https://*.google-analytics.com"]
    : []),
];

const imageSources = [
  "'self'",
  "data:",
  "blob:",
  ...(analyticsEnabled
    ? ["https://www.google-analytics.com", "https://*.google-analytics.com"]
    : []),
];

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSources.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${imageSources.join(" ")}`,
  "font-src 'self'",
  `connect-src ${connectSources.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
]
  .join("; ")
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

if (!isDevelopment) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
