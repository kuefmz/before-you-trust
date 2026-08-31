"use client";

import { useState } from "react";

import { trackEvent } from "@/lib/client-analytics";
import type {
  ConfirmedIdentity,
  SearchContext,
  SearchResult,
} from "@/types/search";

export function EmailReportForm({
  reportLabel,
  searchedName,
  location,
  company,
  profileUrl,
  socialProfiles,
  claim,
  context,
  confirmedIdentity,
  searchQueries,
  results,
}: {
  reportLabel: string;
  searchedName: string;
  location?: string;
  company?: string;
  profileUrl?: string;
  socialProfiles?: string[];
  claim?: string;
  context?: SearchContext;
  confirmedIdentity?: ConfirmedIdentity;
  searchQueries?: string[];
  results: SearchResult[];
}) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setBusy(true);
    trackEvent("report_email_requested", { source_count: results.length });

    try {
      const response = await fetch("/api/report-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          email,
          reportLabel,
          searchedName,
          location,
          company,
          profileUrl,
          socialProfiles,
          claim,
          context,
          confirmedIdentity,
          searchQueries,
          consentAccepted: consent,
          website,
          results: results.map((result) => ({
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            sourceType: result.sourceType,
          })),
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(
          payload.error?.message || "The report could not be emailed.",
        );
      }

      trackEvent("report_email_sent", { source_count: results.length });
      setStatus({
        type: "success",
        message: "Sent. Check your inbox for your Trust Brief.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "The report could not be emailed.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="email-report-card" id="email-report">
      <div>
        <span className="eyebrow">Take it with you</span>
        <h3>Email me this report</h3>
        <p>
          We will send this filtered Trust Brief and its source links to your
          email. The submitted report request is stored in the project&apos;s
          private Google Sheet and is not added to a marketing list.
        </p>
      </div>

      <form className="email-report-form" onSubmit={submit}>
        <label className="field">
          <span>Email address</span>
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label aria-hidden="true" className="honeypot">
          Website
          <input
            autoComplete="off"
            onChange={(event) => setWebsite(event.target.value)}
            tabIndex={-1}
            value={website}
          />
        </label>

        <label className="responsible-use">
          <input
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            required
            type="checkbox"
          />
          <span>
            I understand my email, search context, selected identity and final
            filtered report are stored in the private Before You Trust Google
            Sheet for report delivery, and the report is sent through Google
            email services. They will not be used for marketing without
            separate consent.
          </span>
        </label>

        {status ? (
          <div
            className={
              status.type === "success" ? "success-banner" : "error-banner"
            }
            role="status"
          >
            {status.message}
          </div>
        ) : null}

        <button className="button button--primary" disabled={busy} type="submit">
          {busy ? "Sending report…" : "Email me the report"}
        </button>
      </form>
    </section>
  );
}
