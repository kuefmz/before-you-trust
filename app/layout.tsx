import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { BrandMark } from "@/components/BrandMark";
import { MobileNavigation } from "@/components/MobileNavigation";
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
            <nav aria-label="Primary navigation" className="desktop-nav">
              <Link href="/#search">Look up a person</Link>
              <Link href="/check-company">Check a company</Link>
              <Link href="/how-it-works">How it works</Link>
              <Link href="/about">About</Link>
              <Link href="/share-your-story">Share your story</Link>
              {supportUrl ? <SupportLink href={supportUrl} /> : null}
            </nav>
            <MobileNavigation supportUrl={supportUrl} />
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
              <Link href="/check-company">Check a company</Link>
              <Link href="/share-your-story">Share your story</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/acceptable-use">Acceptable use</Link>
              <a
                href="https://websiteli.ch"
                rel="noopener noreferrer"
                target="_blank"
              >
                Built by Websiteli.ch
              </a>
              <a
                aria-label="View the Before You Trust source code on GitHub"
                className="source-code-link"
                href="https://github.com/kuefmz/before-you-trust"
                rel="noopener noreferrer"
                target="_blank"
              >
                <svg
                  aria-hidden="true"
                  fill="currentColor"
                  height="18"
                  viewBox="0 0 24 24"
                  width="18"
                >
                  <path d="M12 .7a11.3 11.3 0 0 0-3.57 22c.57.1.77-.24.77-.54v-2.2c-3.15.68-3.81-1.34-3.81-1.34-.52-1.31-1.26-1.66-1.26-1.66-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.73 2.65 1.23 3.3.94.1-.73.4-1.23.72-1.51-2.51-.29-5.15-1.26-5.15-5.59 0-1.23.44-2.24 1.17-3.03-.12-.29-.51-1.44.11-2.99 0 0 .95-.3 3.11 1.16a10.8 10.8 0 0 1 5.66 0c2.16-1.46 3.11-1.16 3.11-1.16.62 1.55.23 2.7.11 2.99.73.79 1.17 1.8 1.17 3.03 0 4.34-2.65 5.3-5.17 5.58.41.35.77 1.04.77 2.11v3.19c0 .3.21.65.78.54A11.3 11.3 0 0 0 12 .7Z" />
                </svg>
                <span>Source code</span>
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
