"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { analyticsConsentKey } from "@/lib/client-analytics";

type ConsentState = "granted" | "denied" | null;

function dataLayer(): unknown[] {
  const target = window as Window & { dataLayer?: unknown[] };
  target.dataLayer ??= [];
  return target.dataLayer;
}

function gtagCommand() {
  dataLayer().push(arguments);
}

function setDefaultConsent() {
  gtagCommand("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
}

function loadGtm(gtmId: string) {
  if (document.getElementById("byt-gtm-script")) return;

  gtagCommand("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  dataLayer().push({
    "gtm.start": Date.now(),
    event: "gtm.js",
  });

  const script = document.createElement("script");
  script.id = "byt-gtm-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
}

function clearAnalyticsCookies() {
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (name?.startsWith("_ga")) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    }
  }
}

export function AnalyticsConsent({ gtmId }: { gtmId?: string }) {
  const [state, setState] = useState<ConsentState>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!gtmId) return;

    setDefaultConsent();
    const saved = window.localStorage.getItem(analyticsConsentKey);
    if (saved === "granted") {
      setState("granted");
      loadGtm(gtmId);
    } else if (saved === "denied") {
      setState("denied");
    } else {
      setShow(true);
    }

    const open = () => setShow(true);
    window.addEventListener("byt:open-analytics-preferences", open);
    return () => window.removeEventListener("byt:open-analytics-preferences", open);
  }, [gtmId]);

  if (!gtmId || !show) return null;

  function grant() {
    window.localStorage.setItem(analyticsConsentKey, "granted");
    setState("granted");
    setShow(false);
    loadGtm(gtmId!);
  }

  function reject() {
    window.localStorage.setItem(analyticsConsentKey, "denied");
    setState("denied");
    setShow(false);

    if (state === "granted") {
      clearAnalyticsCookies();
      window.location.reload();
    }
  }

  return (
    <aside
      aria-label="Analytics preferences"
      className="consent-banner"
      role="dialog"
    >
      <div>
        <strong>Optional analytics</strong>
        <p>
          We do not send searched names or story content to analytics. If you
          allow analytics, Google Tag Manager may load GA4 and use analytics
          storage. Rejecting does not affect the site.
        </p>
        <Link href="/privacy">Privacy details</Link>
      </div>
      <div className="consent-actions">
        <button className="button button--ghost" onClick={reject} type="button">
          Reject analytics
        </button>
        <button className="button button--primary" onClick={grant} type="button">
          Allow analytics
        </button>
      </div>
    </aside>
  );
}
