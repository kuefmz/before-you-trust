"use client";

export function PrivacyPreferencesButton() {
  return (
    <button
      className="footer-button"
      onClick={() =>
        window.dispatchEvent(new Event("byt:open-analytics-preferences"))
      }
      type="button"
    >
      Analytics preferences
    </button>
  );
}
