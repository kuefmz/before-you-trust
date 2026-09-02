"use client";

import { useMemo, useState } from "react";

import type {
  ConfirmedIdentity,
  SearchInput,
  SearchResponse,
  SearchResult,
} from "@/types/search";

interface CompanyFormState {
  name: string;
  website: string;
  location: string;
  claim: string;
}

const initialForm: CompanyFormState = {
  name: "",
  website: "",
  location: "",
  claim: "",
};

type CompanyResultGroup = {
  id: string;
  title: string;
  description: string;
  results: SearchResult[];
};

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function parseApiResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const raw = await response.text();
  let payload: T | { error?: { message?: string } } | null = null;

  if (raw.trim()) {
    try {
      payload = JSON.parse(raw) as T | { error?: { message?: string } };
    } catch {
      // The hosting layer may return HTML or an empty response on failure.
    }
  }

  if (!response.ok) {
    const apiMessage =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      payload.error?.message
        ? payload.error.message
        : undefined;

    throw new Error(
      apiMessage ?? `${fallbackMessage} (HTTP ${response.status || "unknown"}).`,
    );
  }

  if (!payload) {
    throw new Error(
      `${fallbackMessage} The server returned an empty response. Please try again.`,
    );
  }

  return payload as T;
}

async function callCompanySearch(body: SearchInput): Promise<SearchResponse> {
  const response = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  return parseApiResponse<SearchResponse>(
    response,
    "Company search could not be completed.",
  );
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

function groupResults(results: SearchResult[]): CompanyResultGroup[] {
  const buckets = {
    concern: [] as SearchResult[],
    official: [] as SearchResult[],
    claim: [] as SearchResult[],
    news: [] as SearchResult[],
    footprint: [] as SearchResult[],
  };

  for (const result of results) {
    if (result.queryKinds.includes("concern")) {
      buckets.concern.push(result);
    } else if (result.queryKinds.includes("claim")) {
      buckets.claim.push(result);
    } else if (
      result.queryKinds.includes("official") ||
      result.sourceType === "official"
    ) {
      buckets.official.push(result);
    } else if (
      result.queryKinds.includes("news") ||
      result.sourceType === "news"
    ) {
      buckets.news.push(result);
    } else {
      buckets.footprint.push(result);
    }
  }

  return [
    {
      id: "official",
      title: "Official & registry sources",
      description:
        "Company registers, regulators and other official-looking public sources. Verify the original source and jurisdiction.",
      results: buckets.official,
    },
    {
      id: "footprint",
      title: "Public footprint & reviews",
      description:
        "Website, review, directory, social and general web results that may help establish how the business presents itself online.",
      results: buckets.footprint,
    },
    {
      id: "news",
      title: "News & independent coverage",
      description:
        "News-oriented results about the company or website. Source quality matters more than the number of mentions.",
      results: buckets.news,
    },
    {
      id: "claim",
      title: "Claim-specific evidence",
      description:
        "Results related to the specific claim you asked to check. These are leads, not automatic verification.",
      results: buckets.claim,
    },
    {
      id: "concern",
      title: "Complaints & warning signals",
      description:
        "Searches for complaints, scam reports, fraud, refunds and counterfeit concerns. A result is not proof that a company did anything wrong.",
      results: buckets.concern,
    },
  ].filter((group) => group.results.length > 0);
}

export function CompanySearchExperience() {
  const [form, setForm] = useState<CompanyFormState>(initialForm);
  const [accepted, setAccepted] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [searchedCompany, setSearchedCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(
    () => groupResults(response?.results ?? []),
    [response],
  );

  function update<K extends keyof CompanyFormState>(
    key: K,
    value: CompanyFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResponse(null);

    if (!accepted) {
      setError("Please confirm responsible and lawful use before searching.");
      return;
    }

    const website = form.website.trim();
    const websiteUrls = website ? [website] : [];
    const confirmedIdentity: ConfirmedIdentity = {
      label: form.name.trim(),
      searchName: form.name.trim(),
      confidence: website ? "high" : "medium",
      supportingSignals: website
        ? ["Company name and website were supplied by the user"]
        : ["Company name was supplied by the user"],
      urls: websiteUrls,
    };

    const input: SearchInput = {
      name: form.name.trim(),
      subjectType: "company",
      location: form.location.trim() || undefined,
      profileUrl: website || undefined,
      claim: form.claim.trim() || undefined,
      context: "business",
      mode: "deep",
      lawfulUseAccepted: true,
      confirmedIdentity,
    };

    setBusy(true);
    try {
      const nextResponse = await callCompanySearch(input);
      setResponse(nextResponse);
      setSearchedCompany(form.name.trim());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Company search failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="experience-panel company-experience" id="company-search">
      <div className="panel-heading">
        <span className="eyebrow">Check before you pay</span>
        <h2>Research the company behind the website.</h2>
        <p>
          Add the business name and website you are considering buying from.
          We search public sources for registration, reviews, news, complaints
          and other signals you can inspect yourself.
        </p>
      </div>

      <form className="company-search-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Company or shop name *</span>
          <input
            autoComplete="organization"
            maxLength={120}
            onChange={(event) => update("name", event.target.value)}
            placeholder="Example Shop"
            required
            value={form.name}
          />
        </label>

        <label className="field">
          <span>Website URL *</span>
          <input
            autoComplete="url"
            maxLength={500}
            onChange={(event) => update("website", event.target.value)}
            placeholder="https://example-shop.com"
            required
            type="url"
            value={form.website}
          />
          <small>
            The domain is an important identity anchor when shops use similar
            or generic names.
          </small>
        </label>

        <label className="field">
          <span>Country or location</span>
          <input
            autoComplete="country-name"
            maxLength={160}
            onChange={(event) => update("location", event.target.value)}
            placeholder="Switzerland"
            value={form.location}
          />
        </label>

        <label className="field">
          <span>Specific claim to check</span>
          <input
            maxLength={300}
            onChange={(event) => update("claim", event.target.value)}
            placeholder="Optional: “Authorized reseller”"
            value={form.claim}
          />
        </label>

        <label className="responsible-use company-search-form__wide">
          <input
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            type="checkbox"
          />
          <span>
            I will use this for lawful due diligence. I understand that search
            results, complaints and reviews are not proof of wrongdoing, and
            that missing results do not guarantee a company is trustworthy.
          </span>
        </label>

        {error ? (
          <div
            aria-live="polite"
            className="error-banner company-search-form__wide"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="form-actions company-search-form__wide">
          <button
            className="button button--primary"
            disabled={busy}
            type="submit"
          >
            {busy ? "Checking public sources…" : "Check this company →"}
          </button>
          <span>
            Public-web research only. This is not a certification, guarantee,
            credit report or automated scam verdict.
          </span>
        </div>
      </form>

      {response ? (
        <div className="company-report" aria-live="polite">
          <div className="company-report__heading">
            <span className="eyebrow">Company Trust Brief</span>
            <h2>{searchedCompany}</h2>
            <p>
              We found {response.results.length} public result
              {response.results.length === 1 ? "" : "s"} across{" "}
              {response.providers.length || 1} search provider
              {response.providers.length === 1 ? "" : "s"}. Open the original
              sources before deciding whether to purchase.
            </p>
          </div>

          <div className="company-coverage-grid">
            <div>
              <strong>{response.results.length}</strong>
              <span>public results</span>
            </div>
            <div>
              <strong>
                {
                  response.results.filter((result) =>
                    result.queryKinds.includes("official"),
                  ).length
                }
              </strong>
              <span>official / registry leads</span>
            </div>
            <div>
              <strong>
                {
                  response.results.filter((result) =>
                    result.queryKinds.includes("concern"),
                  ).length
                }
              </strong>
              <span>complaint / concern leads</span>
            </div>
          </div>

          {response.results.length === 0 ? (
            <div className="quality-note">
              <strong>No useful public results were returned.</strong>{" "}
              This does not mean the company or website is safe. Try checking
              the domain manually and verify payment, contact and registry
              information before purchasing.
            </div>
          ) : null}

          <div className="report-sections">
            {groups.map((group) => (
              <section className="report-section" key={group.id}>
                <div className="report-section__heading">
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </div>
                <div className="result-grid">
                  {group.results.map((result) => (
                    <ResultLink key={result.url} result={result} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {response.warnings.length > 0 ? (
            <details className="technical-note">
              <summary>Search-provider notes</summary>
              <ul>
                {response.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
