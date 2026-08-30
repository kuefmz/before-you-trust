import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/BrandMark";

import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: {
    default: "Before You Trust — Know what the internet already knows",
    template: "%s | Before You Trust",
  },
  description:
    "Search public sources, verify claims, separate identities, and review original evidence before you place meaningful trust in someone.",
  applicationName: "Before You Trust",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Before You Trust",
    description: "Know what the internet already knows.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="shell header-inner">
            <Link aria-label="Before You Trust home" className="brand" href="/">
              <BrandMark />
              <span>Before You Trust</span>
            </Link>
            <nav aria-label="Primary navigation">
              <Link href="/how-it-works">How it works</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/acceptable-use">Use responsibly</Link>
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
              <Link href="/how-it-works">How it works</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/acceptable-use">Acceptable use</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
