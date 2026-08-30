"use client";

import { useMemo, useState } from "react";

import { buildIdentityCandidates } from "@/lib/identity";
import { dedupeResults } from "@/lib/normalize";
import { buildReportSections, claimAssessment } from "@/lib/report";
import type {
  ConfirmedIdentity,
  IdentityCandidate,
  SearchContext,
  SearchInput,
  SearchResponse,
  SearchResult,
} from "@/types/search";

type Stage = "search" | "candidates" | "report";

interface FormState {
  name: string;
  location: string;
  company: string;
  username: string;
  profileUrl: string;
  claim: string;
  context: SearchContext | "";
}

const initialForm: FormState = {
  name: "",
  location: "",
  company: "",
  username: "",
  profileUrl: "",
  claim: "",
  context: "",
};

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function callSearch(
  body: SearchInput,
): Promise<SearchResponse> {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as
    | SearchResponse
    | { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error?.message
        ? payload.error.message
        : "Search failed. Please try again.",
    );
  }

  return payload as SearchResponse;
}

function toInput(
  form: FormState,
  mode: "identity" | "deep",
  confirmedIdentity?: ConfirmedIdentity,
): SearchInput {
  return {
    name: form.name,
    location: form.location || undefined,
    company: form.company || undefined,
    username: form.username || undefined,
    profileUrl: form.profileUrl || undefined,
    claim: form.claim || undefined,
    context: form.context || undefined,
    mode,
    lawfulUseAccepted: true,
    confirmedIdentity,
  };
}

function ResultLink({ result }: { result: SearchResult }) {
  return (
    <a
      className="result-link"
      href={result.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="result-link__meta">
        <span className={`source-pill source-pill--${result.sourceType}`}>
          {result.sourceType}
        </span>
        <span>{hostname(result.url)}</span>
      </span>
      <strong>{result.title}</strong>
      {result.snippet ? <span>{result.snippet}</span> : null}
      <span className="result-link__open">Open original source ↗</span>
    </a>
  );
}

function CandidateCard({
  candidate,
  onConfirm,
  busy,
}: {
  candidate: IdentityCandidate;
  onConfirm: (candidate: IdentityCandidate) => void;
  busy: boolean;
}) {
  return (
    <article className="candidate-card">
      <div className="candidate-card__top">
        <span className={`confidence confidence--${candidate.confidence}`}>
          {candidate.confidence} confidence
        </span>
        <span>{candidate.sources.length} source{candidate.sources.length === 1 ? "" : "s"}</span>
      </div>
      <h3>{candidate.label}</h3>
      <p>{candidate.summary}</p>
      {candidate.supportingSignals.length > 0 ? (
        <ul className="signal-list">
          {candidate.supportingSignals.slice(0, 5).map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      ) : null}
      <div className="candidate-sources">
        {candidate.sources.slice(0, 3).map((source) => (
          <a
            href={source.url}
            key={source.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            {hostname(source.url)} ↗
          </a>
        ))}
      </div>
      <button
        className="button button--primary button--full"
        disabled={busy}
        onClick={() => onConfirm(candidate)}
        type="button"
      >
        {busy ? "Building Trust Brief…" : "This is them"}
      </button>
    </article>
  );
}

export function SearchExperience() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [accepted, setAccepted] = useState(false);
  const [stage, setStage] = useState<Stage>("search");
  const [identityResponse, setIdentityResponse] = useState<SearchResponse | null>(
    null,
  );
  const [deepResponse, setDeepResponse] = useState<SearchResponse | null>(null);
  const [candidates, setCandidates] = useState<IdentityCandidate[]>([]);
  const [confirmed, setConfirmed] = useState<IdentityCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportResults = useMemo(() => {
    if (!identityResponse && !deepResponse) return [];
    const contributions = [
      ...(identityResponse?.results ?? []),
      ...(deepResponse?.results ?? []),
    ].flatMap((result) =>
      result.queries.map((query, index) => ({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        publishedAt: result.publishedAt,
        provider: result.providers[0] ?? "unknown",
        query,
        queryKind: result.queryKinds[index] ?? result.queryKinds[0] ?? "general",
      })),
    );
    return dedupeResults(contributions, 80);
  }, [identityResponse, deepResponse]);

  const reportSections = useMemo(
    () => buildReportSections(reportResults),
    [reportResults],
  );

  const claimStatus = useMemo(
    () => (form.claim ? claimAssessment(reportResults) : null),
    [form.claim, reportResults],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleIdentitySearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!accepted) {
      setError("Please confirm responsible and lawful use before searching.");
      return;
    }

    setBusy(true);
    try {
      const response = await callSearch(toInput(form, "identity"));
      const nextCandidates = buildIdentityCandidates(response.results, form);
      setIdentityResponse(response);
      setCandidates(nextCandidates);
      setStage("candidates");
      if (nextCandidates.length === 0) {
        setError(
          "We found too little reliable identity information to suggest a match. Try adding a city, employer, username, or profile URL.",
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCandidate(candidate: IdentityCandidate) {
    setError(null);
    setBusy(true);
    setConfirmed(candidate);

    const confirmedIdentity: ConfirmedIdentity = {
      label: candidate.label,
      confidence: candidate.confidence,
      supportingSignals: candidate.supportingSignals,
      urls: candidate.sources.map((source) => source.url),
    };

    try {
      const response = await callSearch(
        toInput(form, "deep", confirmedIdentity),
      );
      setDeepResponse(response);
      setStage("report");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Deep search failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setForm(initialForm);
    setAccepted(false);
    setStage("search");
    setIdentityResponse(null);
    setDeepResponse(null);
    setCandidates([]);
    setConfirmed(null);
    setError(null);
  }

  if (stage === "report") {
    const officialCount = reportResults.filter(
      (result) => result.sourceType === "official",
    ).length;
    const concernCount = reportResults.filter((result) =>
      result.queryKinds.includes("concern"),
    ).length;

    return (
      <section aria-labelledby="trust-brief-title" className="experience-panel">
        <div className="panel-heading panel-heading--split">
          <div>
            <span className="eyebrow">Evidence-first report</span>
            <h2 id="trust-brief-title">Trust Brief</h2>
            <p>
              For <strong>{confirmed?.label ?? form.name}</strong>. Review the
              original sources before drawing conclusions.
            </p>
          </div>
          <button className="button button--ghost" onClick={reset} type="button">
            New search
          </button>
        </div>

        <div className="report-warning" role="note">
          This report summarizes public search results and may be incomplete or
          incorrect. A missing record does not prove safety, and an allegation
          does not prove wrongdoing.
        </div>

        <div className="coverage-grid">
          <div>
            <strong>{reportResults.length}</strong>
            <span>unique public sources</span>
          </div>
          <div>
            <strong>{reportSections.length}</strong>
            <span>evidence categories</span>
          </div>
          <div>
            <strong>{officialCount}</strong>
            <span>official-source matches</span>
          </div>
          <div>
            <strong>{concernCount}</strong>
            <span>sources needing closer review</span>
          </div>
        </div>

        {claimStatus ? (
          <div className="claim-status">
            <span className="eyebrow">Claim check</span>
            <h3>{claimStatus.label}</h3>
            <p>{claimStatus.detail}</p>
          </div>
        ) : null}

        <div className="report-sections">
          {reportSections.map((section) => (
            <section className="report-section" key={section.id}>
              <div className="report-section__heading">
                <h3>{section.title}</h3>
                <p>{section.description}</p>
              </div>
              <div className="result-grid">
                {section.results.map((result) => (
                  <ResultLink key={result.url} result={result} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {(deepResponse?.warnings.length ?? 0) > 0 ? (
          <details className="technical-note">
            <summary>Search-provider notes</summary>
            <ul>
              {deepResponse?.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>
    );
  }

  if (stage === "candidates") {
    return (
      <section aria-labelledby="candidate-title" className="experience-panel">
        <div className="panel-heading">
          <span className="eyebrow">Identity confirmation</span>
          <h2 id="candidate-title">Is this the person?</h2>
          <p>
            We do not merge every matching name into one profile. Confirm the
            right identity before deeper research begins.
          </p>
        </div>

        {error ? (
          <div aria-live="polite" className="error-banner" role="alert">
            {error}
          </div>
        ) : null}

        <div className="candidate-grid">
          {candidates.map((candidate) => (
            <CandidateCard
              busy={busy}
              candidate={candidate}
              key={candidate.id}
              onConfirm={confirmCandidate}
            />
          ))}
        </div>

        {identityResponse && identityResponse.results.length > 0 ? (
          <details className="technical-note">
            <summary>
              See all {identityResponse.results.length} identity-search sources
            </summary>
            <div className="result-grid result-grid--compact">
              {identityResponse.results.map((result) => (
                <ResultLink key={result.url} result={result} />
              ))}
            </div>
          </details>
        ) : null}

        <button
          className="button button--ghost"
          disabled={busy}
          onClick={() => setStage("search")}
          type="button"
        >
          ← Refine search
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="search-title" className="experience-panel">
      <div className="panel-heading">
        <span className="eyebrow">Start with identity, not assumptions</span>
        <h2 id="search-title">Who are you thinking of trusting?</h2>
        <p>
          Add whatever context you already know. More context helps us separate
          the right person from namesakes.
        </p>
      </div>

      <form className="search-form" onSubmit={handleIdentitySearch}>
        <label className="field field--wide">
          <span>Full name *</span>
          <input
            autoComplete="off"
            maxLength={120}
            name="name"
            onChange={(event) => update("name", event.target.value)}
            placeholder="Jane Unique-Surname"
            required
            value={form.name}
          />
        </label>

        <label className="field">
          <span>City or country</span>
          <input
            autoComplete="off"
            maxLength={160}
            onChange={(event) => update("location", event.target.value)}
            placeholder="Zurich, Switzerland"
            value={form.location}
          />
        </label>

        <label className="field">
          <span>Employer or organization</span>
          <input
            autoComplete="off"
            maxLength={180}
            onChange={(event) => update("company", event.target.value)}
            placeholder="Example AG"
            value={form.company}
          />
        </label>

        <label className="field">
          <span>Username</span>
          <input
            autoComplete="off"
            maxLength={120}
            onChange={(event) => update("username", event.target.value)}
            placeholder="@janesmith"
            value={form.username}
          />
        </label>

        <label className="field">
          <span>Known profile URL</span>
          <input
            autoComplete="off"
            maxLength={500}
            onChange={(event) => update("profileUrl", event.target.value)}
            placeholder="https://…"
            type="url"
            value={form.profileUrl}
          />
        </label>

        <label className="field">
          <span>Context</span>
          <select
            onChange={(event) =>
              update("context", event.target.value as SearchContext | "")
            }
            value={form.context}
          >
            <option value="">Not specified</option>
            <option value="dating">Dating / personal</option>
            <option value="business">Business / investment</option>
            <option value="professional">Professional</option>
            <option value="community">Community / organization</option>
            <option value="online">Online identity</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="field field--wide">
          <span>Specific claim to check</span>
          <textarea
            maxLength={300}
            onChange={(event) => update("claim", event.target.value)}
            placeholder="Optional: “They say they are the founder of…”"
            rows={3}
            value={form.claim}
          />
        </label>

        <label className="responsible-use field--wide">
          <input
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            type="checkbox"
          />
          <span>
            I will use this for a lawful, legitimate purpose and not to harass,
            stalk, doxx, or target a minor.
          </span>
        </label>

        {error ? (
          <div aria-live="polite" className="error-banner field--wide" role="alert">
            {error}
          </div>
        ) : null}

        <div className="form-actions field--wide">
          <button
            className="button button--primary"
            disabled={busy}
            type="submit"
          >
            {busy ? "Searching public sources…" : "Search the public web →"}
          </button>
          <span>
            We do not store your search in a Before You Trust database.
          </span>
        </div>
      </form>
    </section>
  );
}
