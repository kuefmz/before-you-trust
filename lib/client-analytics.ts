export type AnalyticsEventName =
  | "search_started"
  | "search_completed"
  | "identity_confirmed"
  | "trust_brief_viewed"
  | "source_opened"
  | "share_story_viewed"
  | "story_submitted"
  | "support_click";

const CONSENT_KEY = "byt.analytics-consent";

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CONSENT_KEY) === "granted";
}

export function trackEvent(
  event: AnalyticsEventName,
  parameters: Record<string, string | number | boolean> = {},
): void {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;

  const target = window as Window & {
    dataLayer?: Array<Record<string, unknown>>;
  };
  target.dataLayer ??= [];
  target.dataLayer.push({ event, ...parameters });
}

export const analyticsConsentKey = CONSENT_KEY;
