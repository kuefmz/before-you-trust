import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { BrandMark } from "@/components/BrandMark";
import { PrivacyPreferencesButton } from "@/components/PrivacyPreferencesButton";
import { SupportLink } from "@/components/SupportLink";
import {
  configuredSiteUrl,
  indexingEnabled,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/seo";

import "./globals.css";

const siteUrl = configuredSiteUrl();
const verification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
const supportUrl =
  process.env.NEXT_PUBLIC_BUY_ME_A_COFFEE_URL?.trim() ||
  "https://buymeacoffee.com/jenifertabitaciuciukiss";
const ga4Id =
  process.env.NEXT_PUBLIC_GA4_ID?.trim() || "G-MVDVBJJFQB";
const gtmId =
  process.env.NEXT_PUBLIC_GTM_ID?.trim() || "GTM-TPGSP8XN";

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: "Before You Trust — Verify Someone's Public Web Footprint",
    template: "%s | Before You Trust",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  verification: verification ? { google: verification } : undefined,
  robots: {
    index: indexingEnabled(),
    follow: indexingEnabled(),
  },
  openGraph: {
    title: "Before You Trust — Verify Someone's Public Web Footprint",
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    url: siteUrl,
  },
  twitter: {
    card: "summary",
    title: "Before You Trust — Verify Someone's Public Web Footprint",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <header className="site-header">
          <div className="shell header-inner">
            <Link aria-label="Before You Trust home" className="brand" href="/">
              <BrandMark />
              <span>Before You Trust</span>
            </Link>
            <nav aria-label="Primary navigation">
              <Link href="/how-it-works">How it works</Link>
              <Link href="/about">About</Link>
              <Link href="/share-your-story">Share your story</Link>
              {supportUrl ? <SupportLink href={supportUrl} /> : null}
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="shell footer-inner">
            <div>
              <Link className="brand brand--footer" href="/">
                <BrandMark size={30} />
                <span>Before You Trust</span>
              </Link>
              <p>Information first. Decisions second.</p>
            </div>
            <div className="footer-links">
              <Link href="/about">About</Link>
              <Link href="/share-your-story">Share your story</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/acceptable-use">Acceptable use</Link>
              <a
                href="https://github.com/kuefmz/before-you-trust"
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub ↗
              </a>
              {ga4Id || gtmId ? <PrivacyPreferencesButton /> : null}
            </div>
          </div>
        </footer>

        <AnalyticsConsent ga4Id={ga4Id} gtmId={gtmId} />
      </body>
    </html>
  );
}
