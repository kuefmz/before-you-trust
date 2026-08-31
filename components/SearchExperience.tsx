"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { EmailReportForm } from "@/components/EmailReportForm";
import { JourneyProgress } from "@/components/JourneyProgress";
import { ManualSearchPanel } from "@/components/ManualSearchPanel";

import { buildIdentityCandidates } from "@/lib/identity";
import { trackEvent } from "@/lib/client-analytics";
import { mergeSearchResults } from "@/lib/normalize";
import { buildDeepQueries, buildIdentityQueries } from "@/lib/queries";
import { buildReportSections, claimAssessment, filterResultsForConfirmedIdentity } from "@/lib/report";
import type {
  ConfirmedIdentity,
  IdentityCandidate,
  ImageSearchResponse,
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
  profileUrl: string;
  socialProfiles: string;
  claim: string;
  context: SearchContext | "";
}

const initialForm: FormState = {
  name: "",
  location: "",
  company: "",
  profileUrl: "",
  socialProfiles: "",
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

async function callSearch(body: SearchInput): Promise<SearchResponse> {
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

function parseSocialProfiles(value: string): string[] | undefined {
  const items = value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  return items.length ? [...new Set(items)] : undefined;
}

async function callImageSearch(photo: File): Promise<ImageSearchResponse> {
  const formData = new FormData();
  formData.append("photo", photo);
  const response = await fetch("/api/image-search", {
    method: "POST",
    cache: "no-store",
    body: formData,
  });
  const payload = (await response.json()) as
    | ImageSearchResponse
    | { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error?.message
        ? payload.error.message
        : "Photo web matching failed.",
    );
  }
  return payload as ImageSearchResponse;
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
    profileUrl: form.profileUrl || undefined,
    socialProfiles: parseSocialProfiles(form.socialProfiles),
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
      onClick={() =>
        trackEvent("source_opened", { source_type: result.sourceType })
      }
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
  rank,
  onConfirm,
  busy,
  confirming,
}: {
  candidate: IdentityCandidate;
  rank: number;
  onConfirm: (candidate: IdentityCandidate) => void;
  busy: boolean;
  confirming: boolean;
}) {
  return (
    <article className="candidate-card">
      <div className="candidate-card__top">
        <span className="match-rank">Top match #{rank}</span>
        <span className={`confidence confidence--${candidate.confidence}`}>
          {candidate.confidence} confidence
        </span>
        <span>
          {candidate.sources.length} source
          {candidate.sources.length === 1 ? "" : "s"}
        </span>
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
        {busy && confirming ? "Building Trust Brief…" : "This is them"}
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
  const [imageResponse, setImageResponse] = useState<ImageSearchResponse | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoWarning, setPhotoWarning] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<IdentityCandidate[]>([]);
  const [confirmed, setConfirmed] = useState<IdentityCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingCandidateId, setConfirmingCandidateId] = useState<string | null>(null);
  const [manualSearchOpen, setManualSearchOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const previousStageRef = useRef<Stage>(stage);

  const confirmedIdentityForSearch = useMemo<ConfirmedIdentity | undefined>(
    () =>
      confirmed
        ? {
            label: confirmed.label,
            searchName: confirmed.searchName,
            confidence: confirmed.confidence,
            supportingSignals: confirmed.supportingSignals,
            urls: confirmed.sources.map((source) => source.url),
          }
        : undefined,
    [confirmed],
  );

  const manualSearchQueries = useMemo(() => {
    if (form.name.trim().length < 2) return [];

    if (stage === "report" && confirmedIdentityForSearch) {
      return buildDeepQueries(
        toInput(form, "deep", confirmedIdentityForSearch),
      );
    }

    return buildIdentityQueries(toInput(form, "identity"));
  }, [form, stage, confirmedIdentityForSearch]);

  const candidateSourceUrls = useMemo(
    () => new Set(candidates.flatMap((candidate) => candidate.sources.map((source) => source.url))),
    [candidates],
  );

  const candidateMatchedIdentityResults = useMemo(
    () =>
      (identityResponse?.results ?? []).filter((result) =>
        candidateSourceUrls.has(result.url),
      ),
    [identityResponse, candidateSourceUrls],
  );

  const identityExcludedCount = Math.max(
    0,
    (identityResponse?.results.length ?? 0) - candidateMatchedIdentityResults.length,
  );

  useEffect(() => {
    if (previousStageRef.current === stage) return;
    previousStageRef.current = stage;

    const scrollToPanel = () => {
      panelRef.current?.scrollIntoView?.({
        behavior: "smooth",
        block: "start",
      });
    };

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(scrollToPanel);
    } else {
      scrollToPanel();
    }
  }, [stage]);

  const reportQuality = useMemo(() => {
    if (!confirmed) return { results: [] as SearchResult[], excludedCount: 0 };

    const filteredDeep = filterResultsForConfirmedIdentity(
      deepResponse?.results ?? [],
      confirmed.sources,
      {
        name: confirmed.searchName || form.name,
        location: form.location || undefined,
        company: form.company || undefined,
        profileUrl: form.profileUrl || undefined,
        socialProfiles: parseSocialProfiles(form.socialProfiles),
      },
    );

    return {
      results: mergeSearchResults(
        [...confirmed.sources, ...filteredDeep.results],
        80,
      ),
      excludedCount: filteredDeep.excludedCount,
    };
  }, [
    confirmed,
    deepResponse,
    form.name,
    form.location,
    form.company,
    form.profileUrl,
    form.socialProfiles,
  ]);

  const reportResults = reportQuality.results;

  const reportSections = useMemo(
    () => buildReportSections(reportResults),
    [reportResults],
  );

  const claimStatus = useMemo(
    () => (form.claim ? claimAssessment(reportResults) : null),
    [form.claim, reportResults],
  );

  const reportSearchQueries = useMemo(
    () => [
      ...new Set(
        [
          ...(identityResponse?.results ?? []),
          ...(deepResponse?.results ?? []),
        ].flatMap((result) => result.queries),
      ),
    ].slice(0, 50),
    [identityResponse, deepResponse],
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

    trackEvent("search_started", {
      mode: "identity",
      has_location: Boolean(form.location),
      has_company: Boolean(form.company),
      has_profile_url: Boolean(form.profileUrl),
      has_social_profiles: Boolean(form.socialProfiles.trim()),
      has_photo: Boolean(photo),
      has_claim: Boolean(form.claim),
    });

    // Every submit is a fresh search run. Never carry results or a previous
    // confirmation into a new identity search.
    setIdentityResponse(null);
    setDeepResponse(null);
    setImageResponse(null);
    setCandidates([]);
    setConfirmed(null);
    setConfirmingCandidateId(null);
    setBusy(true);
    setPhotoWarning(null);
    try {
      const searchInput = toInput(form, "identity");
      const response = await callSearch(searchInput);
      let image: ImageSearchResponse | null = null;

      if (photo) {
        try {
          image = await callImageSearch(photo);
          setImageResponse(image);
        } catch (imageError) {
          setImageResponse(null);
          setPhotoWarning(
            imageError instanceof Error
              ? imageError.message
              : "Photo web matching was unavailable.",
          );
        }
      } else {
        setImageResponse(null);
      }

      const combinedResults = mergeSearchResults([
        ...response.results,
        ...(image?.matches ?? []),
      ]);
      const mergedResponse: SearchResponse = {
        ...response,
        results: combinedResults,
        providers: [...new Set([
          ...response.providers,
          ...(image ? [image.provider] : []),
        ])],
      };
      const nextCandidates = buildIdentityCandidates(combinedResults, searchInput);
      setIdentityResponse(mergedResponse);
      setCandidates(nextCandidates);
      setStage("candidates");
      trackEvent("search_completed", {
        mode: "identity",
        result_count: combinedResults.length,
        candidate_count: nextCandidates.length,
      });
      if (nextCandidates.length === 0) {
        setError(
          "We found too little reliable identity information to suggest a match. Try adding a city, employer, social profile/handle, or profile URL.",
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
    setConfirmingCandidateId(candidate.id);
    setConfirmed(candidate);
    trackEvent("identity_confirmed", {
      confidence: candidate.confidence,
      source_count: candidate.sources.length,
    });

    const confirmedIdentity: ConfirmedIdentity = {
      label: candidate.label,
      searchName: candidate.searchName,
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
      trackEvent("trust_brief_viewed", {
        result_count: response.results.length,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Deep search failed.");
    } finally {
      setBusy(false);
      setConfirmingCandidateId(null);
    }
  }

  function refineSearch() {
    setStage("search");
    setIdentityResponse(null);
    setDeepResponse(null);
    setImageResponse(null);
    setCandidates([]);
    setConfirmed(null);
    setConfirmingCandidateId(null);
    setError(null);
    setPhotoWarning(null);
    setManualSearchOpen(false);
  }

  function reset() {
    setForm(initialForm);
    setAccepted(false);
    setStage("search");
    setIdentityResponse(null);
    setDeepResponse(null);
    setImageResponse(null);
    setCandidates([]);
    setConfirmed(null);
    setConfirmingCandidateId(null);
    setManualSearchOpen(false);
    setError(null);
    setPhoto(null);
    setPhotoWarning(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  }

  if (stage === "report") {
    const officialCount = reportResults.filter(
      (result) => result.sourceType === "official",
    ).length;
    const concernCount = reportResults.filter((result) =>
      result.queryKinds.includes("concern"),
    ).length;

    return (
      <section
        aria-labelledby="trust-brief-title"
        className="experience-panel"
        ref={panelRef}
      >
        <JourneyProgress
          manualSearchOpen={manualSearchOpen}
          onStartNewSearch={reset}
          onToggleManualSearch={() => setManualSearchOpen((open) => !open)}
          step={3}
        />
        {manualSearchOpen ? (
          <ManualSearchPanel queries={manualSearchQueries} />
        ) : null}
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Evidence-first report</span>
            <h2 id="trust-brief-title">Trust Brief</h2>
            <p>
              For <strong>{confirmed?.label ?? form.name}</strong>. Review the
              original sources before drawing conclusions.
            </p>
          </div>
        </div>

        <div className="report-warning" role="note">
          This report contains only sources linked to the identity you selected
          with sufficient confidence. A missing record does not prove safety,
          and an allegation does not prove wrongdoing.
          {reportQuality.excludedCount > 0 ? (
            <p>
              <strong>
                {reportQuality.excludedCount} low-confidence result
                {reportQuality.excludedCount === 1 ? " was" : "s were"} excluded
                because it could not be linked strongly enough to this person.
              </strong>
            </p>
          ) : null}
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

        <EmailReportForm
          claim={form.claim || undefined}
          company={form.company || undefined}
          confirmedIdentity={confirmedIdentityForSearch}
          context={form.context || undefined}
          location={form.location || undefined}
          profileUrl={form.profileUrl || undefined}
          reportLabel={confirmed?.label ?? form.name}
          results={reportResults}
          searchedName={form.name}
          searchQueries={reportSearchQueries}
          socialProfiles={parseSocialProfiles(form.socialProfiles)}
        />

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
      <section
        aria-labelledby="candidate-title"
        className="experience-panel"
        ref={panelRef}
      >
        <JourneyProgress
          manualSearchOpen={manualSearchOpen}
          onStartNewSearch={reset}
          onToggleManualSearch={() => setManualSearchOpen((open) => !open)}
          step={2}
        />
        {manualSearchOpen ? (
          <ManualSearchPanel queries={manualSearchQueries} />
        ) : null}
        <div className="panel-heading">
          <span className="eyebrow">Identity confirmation</span>
          <h2 id="candidate-title">Which person do you mean?</h2>
          <p>
            {candidates.length === 0
              ? "We did not find a candidate with enough identity evidence to show safely. Add more context or use the manual Google searches above."
              : candidates.length === 1
                ? "We found one likely identity. Please confirm it before we generate a report."
                : `We found ${candidates.length} likely identity matches. Choose the correct person before we generate a report.`}
          </p>
        </div>

        {photoWarning ? (
          <div className="photo-warning" role="note">
            {photoWarning} Text and social search results are still shown.
          </div>
        ) : null}

        {imageResponse ? (
          <div className="image-match-summary" role="note">
            <strong>Photo web match:</strong>{" "}
            {imageResponse.matches.length} public pages,{" "}
            {imageResponse.exactImageMatches} full-image matches and{" "}
            {imageResponse.partialImageMatches} partial matches found.
          </div>
        ) : null}

        {error ? (
          <div aria-live="polite" className="error-banner" role="alert">
            {error}
          </div>
        ) : null}

        {identityExcludedCount > 0 ? (
          <div className="quality-note" role="note">
            <strong>
              {identityExcludedCount} low-confidence search result
              {identityExcludedCount === 1 ? " was" : "s were"} hidden.
            </strong>{" "}
            They did not contain enough identity evidence to show as a possible
            match.
          </div>
        ) : null}

        <p className="candidate-help">
          Missing an expected Instagram, Facebook, LinkedIn or other profile?
          Use <strong>Do it yourself</strong> above to run the same
          site-specific searches directly on Google.
        </p>

        <div className="candidate-grid">
          {candidates.map((candidate, index) => (
            <CandidateCard
              busy={busy}
              candidate={candidate}
              confirming={confirmingCandidateId === candidate.id}
              key={candidate.id}
              onConfirm={confirmCandidate}
              rank={index + 1}
            />
          ))}
        </div>

        {candidateMatchedIdentityResults.length > 0 ? (
          <details className="technical-note">
            <summary>
              See {candidateMatchedIdentityResults.length} candidate-matched
              identity source
              {candidateMatchedIdentityResults.length === 1 ? "" : "s"}
            </summary>
            <div className="result-grid result-grid--compact">
              {candidateMatchedIdentityResults.map((result) => (
                <ResultLink key={result.url} result={result} />
              ))}
            </div>
          </details>
        ) : null}

        <button
          className="button button--ghost"
          disabled={busy}
          onClick={refineSearch}
          type="button"
        >
          None of these — refine search
        </button>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="search-title"
      className="experience-panel"
      ref={panelRef}
    >
      <JourneyProgress
        manualSearchOpen={manualSearchOpen}
        onStartNewSearch={reset}
        onToggleManualSearch={() => setManualSearchOpen((open) => !open)}
        step={1}
      />
      {manualSearchOpen ? (
        <ManualSearchPanel queries={manualSearchQueries} />
      ) : null}
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
          <span>Known website or profile URL</span>
          <input
            autoComplete="off"
            maxLength={500}
            onChange={(event) => update("profileUrl", event.target.value)}
            placeholder="https://…"
            type="url"
            value={form.profileUrl}
          />
        </label>

        <label className="field field--wide">
          <span>Social profiles or handles</span>
          <small>
            Instagram, TikTok, Facebook, X, LinkedIn, YouTube or GitHub —
            paste links or handles, separated by commas or new lines.
          </small>
          <textarea
            maxLength={2500}
            onChange={(event) => update("socialProfiles", event.target.value)}
            placeholder={"@knownhandle\nhttps://instagram.com/knownprofile"}
            rows={3}
            value={form.socialProfiles}
          />
        </label>

        <label className="photo-upload field--wide">
          <span>Photo (optional)</span>
          <small>
            JPG, PNG or WebP, up to 5 MB. We use it only for transient public-web
            image matching; it is not stored by Before You Trust.
          </small>
          <input
            accept="image/jpeg,image/png,image/webp"
            aria-label="Photo of the person"
            onChange={(event) => {
              const nextPhoto = event.target.files?.[0] ?? null;
              if (nextPhoto && nextPhoto.size > 5 * 1024 * 1024) {
                setError("Photo must be 5 MB or smaller.");
                event.target.value = "";
                return;
              }
              if (photoPreview) URL.revokeObjectURL(photoPreview);
              setPhoto(nextPhoto);
              setPhotoPreview(nextPhoto ? URL.createObjectURL(nextPhoto) : null);
              setPhotoWarning(null);
            }}
            type="file"
          />
          {photoPreview ? (
            <div className="photo-preview">
              <Image
                alt="Selected person preview"
                height={92}
                src={photoPreview}
                unoptimized
                width={92}
              />
              <button
                className="button button--ghost"
                onClick={() => {
                  URL.revokeObjectURL(photoPreview);
                  setPhoto(null);
                  setPhotoPreview(null);
                }}
                type="button"
              >
                Remove photo
              </button>
            </div>
          ) : null}
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
            stalk, doxx, target a minor, or make a regulated eligibility
            decision about employment, housing, credit, insurance, or similar.
          </span>
        </label>

        {error ? (
          <div
            aria-live="polite"
            className="error-banner field--wide"
            role="alert"
          >
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
            Search and report data are not persisted by the app itself. When
            report delivery is configured, the Google Sheet is the application
            datastore for the submitted report request. Photos are not stored.{" "}
            <a href="/privacy">Privacy details</a>
          </span>
        </div>
      </form>
    </section>
  );
}
