"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { analyticsConsentKey } from "@/lib/client-analytics";

type ConsentState = "granted" | "denied" | null;

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

function dataLayer(): unknown[] {
  const target = window as AnalyticsWindow;
  target.dataLayer ??= [];
  return target.dataLayer;
}

type GtagCommand = (...args: unknown[]) => void;

const gtagCommand: GtagCommand = function () {
  // eslint-disable-next-line prefer-rest-params -- Google's gtag queue expects the native Arguments object.
  dataLayer().push(arguments);
};

function setDefaultConsent() {
  gtagCommand("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
}

function grantAnalyticsStorage() {
  gtagCommand("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

function loadGa4(ga4Id: string) {
  if (document.getElementById("byt-ga4-script")) return;

  grantAnalyticsStorage();

  const target = window as AnalyticsWindow;
  target.gtag = gtagCommand;

  const script = document.createElement("script");
  script.id = "byt-ga4-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
  document.head.appendChild(script);

  gtagCommand("js", new Date());
  gtagCommand("config", ga4Id, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}

function loadGtm(gtmId: string) {
  if (document.getElementById("byt-gtm-script")) return;

  grantAnalyticsStorage();

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

function loadConfiguredAnalytics(ga4Id?: string, gtmId?: string) {
  if (ga4Id) loadGa4(ga4Id);
  if (gtmId) loadGtm(gtmId);
}

export function AnalyticsConsent({
  ga4Id,
  gtmId,
}: {
  ga4Id?: string;
  gtmId?: string;
}) {
  const [state, setState] = useState<ConsentState>(null);
  const [show, setShow] = useState(false);
  const configured = Boolean(ga4Id || gtmId);

  useEffect(() => {
    if (!configured) return;

    setDefaultConsent();
    const saved = window.localStorage.getItem(analyticsConsentKey);
    if (saved === "granted") {
      setState("granted");
      loadConfiguredAnalytics(ga4Id, gtmId);
    } else if (saved === "denied") {
      setState("denied");
    } else {
      setShow(true);
    }

    const open = () => setShow(true);
    window.addEventListener("byt:open-analytics-preferences", open);
    return () =>
      window.removeEventListener("byt:open-analytics-preferences", open);
  }, [configured, ga4Id, gtmId]);

  if (!configured || !show) return null;

  function grant() {
    window.localStorage.setItem(analyticsConsentKey, "granted");
    setState("granted");
    setShow(false);
    loadConfiguredAnalytics(ga4Id, gtmId);
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
          We do not send searched names, report contents, source URLs or story
          content to analytics. If you allow analytics, Google Analytics may
          load and use analytics storage. Rejecting does not affect the site.
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
