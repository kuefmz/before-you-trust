"use client";

import { useEffect, useState } from "react";

import { trackEvent } from "@/lib/client-analytics";
import type { StoryTopic } from "@/lib/story-validation";

interface FormState {
  topic: StoryTopic;
  name: string;
  email: string;
  message: string;
  permissionToPublish: boolean;
  adultConfirmed: boolean;
  privacyAccepted: boolean;
  website: string;
}

const initialState: FormState = {
  topic: "story",
  name: "",
  email: "",
  message: "",
  permissionToPublish: false,
  adultConfirmed: false,
  privacyAccepted: false,
  website: "",
};

export function StoryForm() {
  const [form, setForm] = useState(initialState);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  useEffect(() => {
    trackEvent("share_story_viewed");
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setBusy(true);

    try {
      const response = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(
          payload.error?.message || "Your submission could not be delivered.",
        );
      }

      trackEvent("story_submitted", { topic: form.topic });
      setStatus({
        type: "success",
        message:
          "Thank you. Your message was delivered privately to the project operator.",
      });
      setForm(initialState);
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Your submission could not be delivered.",
      });
    } finally {
      setBusy(false);
    }
  }

  const adultRequired = form.topic !== "privacy";

  return (
    <form className="story-form" onSubmit={submit}>
      <label className="field">
        <span>What would you like to share?</span>
        <select
          onChange={(event) => update("topic", event.target.value as StoryTopic)}
          value={form.topic}
        >
          <option value="story">Share my story</option>
          <option value="concern">Report a concern / give feedback</option>
          <option value="privacy">Privacy / data request</option>
          <option value="other">Other</option>
        </select>
      </label>

      <div className="form-two-column">
        <label className="field">
          <span>Name (optional)</span>
          <input
            autoComplete="name"
            maxLength={120}
            onChange={(event) => update("name", event.target.value)}
            value={form.name}
          />
        </label>

        <label className="field">
          <span>Email for a reply (optional)</span>
          <input
            autoComplete="email"
            maxLength={240}
            onChange={(event) => update("email", event.target.value)}
            type="email"
            value={form.email}
          />
        </label>
      </div>

      <label className="field">
        <span>Your message</span>
        <textarea
          maxLength={7000}
          minLength={40}
          onChange={(event) => update("message", event.target.value)}
          placeholder="Tell me what happened, what you wish you had been able to check earlier, or what you think this project should do better."
          required
          rows={9}
          value={form.message}
        />
      </label>

      <label aria-hidden="true" className="honeypot">
        Website
        <input
          autoComplete="off"
          onChange={(event) => update("website", event.target.value)}
          tabIndex={-1}
          value={form.website}
        />
      </label>

      {adultRequired ? (
        <label className="responsible-use">
          <input
            checked={form.adultConfirmed}
            onChange={(event) => update("adultConfirmed", event.target.checked)}
            type="checkbox"
          />
          <span>I confirm that I am 18 or older.</span>
        </label>
      ) : null}

      <label className="responsible-use">
        <input
          checked={form.privacyAccepted}
          onChange={(event) => update("privacyAccepted", event.target.checked)}
          required
          type="checkbox"
        />
        <span>
          I understand that this message is emailed to the project operator
          through the project&apos;s Google Apps Script delivery service. It is
          not stored in the application database or report Sheet. If I provide
          an email address, it can be used to reply to me.
        </span>
      </label>

      <label className="responsible-use responsible-use--optional">
        <input
          checked={form.permissionToPublish}
          onChange={(event) =>
            update("permissionToPublish", event.target.checked)
          }
          type="checkbox"
        />
        <span>
          Optional: I allow an anonymized excerpt of my submission to be used
          to explain the problem or improve awareness. This is not required.
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

      <button
        className="button button--primary"
        disabled={busy}
        type="submit"
      >
        {busy ? "Sending privately…" : "Send privately"}
      </button>
    </form>
  );
}
