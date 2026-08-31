# Before You Trust — Public Launch Readiness

This checklist is intentionally stricter than "the build is green." It covers
technical, search-quality, SEO, privacy, and operational launch checks.

It is not legal advice and does not certify compliance in every jurisdiction.
Before a large-scale or paid launch, obtain jurisdiction-specific legal review,
especially because the service processes information about identifiable people.

## Release blockers

Do not enable public indexing until all blockers below are complete.

### 1. Live search quality

- [ ] SearXNG and YaCy are running on production-reachable HTTPS endpoints.
- [ ] `SEARCH_PROVIDER=auto`.
- [ ] The synthetic exact-identity benchmark passes:
  ```bash
  npm run benchmark:identity
  ```
- [ ] The live retrieval benchmark passes against the real search stack:
  ```bash
  APP_BASE_URL=https://YOUR-STAGING-DOMAIN npm run benchmark:live
  ```
- [ ] Add at least one known high-footprint exact-name benchmark and verify
  that multiple independent public sources are retrieved.
- [ ] Similar names are rejected rather than silently substituted.
- [ ] A no-result state never claims that the searched person is safe.

### 2. Data protection and misuse controls

- [ ] Search remains limited to public-web information and does not bypass
  authentication, access controls, or platform safeguards.
- [ ] Minors are prohibited as search targets.
- [ ] Employment, housing, tenancy, credit, insurance, and comparable regulated
  eligibility uses remain prohibited in UI, Terms, and Acceptable Use.
- [ ] The service does not make a legally significant automated decision or
  person-level trust/danger score.
- [ ] Sensitive or damaging material remains source-linked and requires strong
  identity attribution before inclusion.
- [ ] Set `NEXT_PUBLIC_PRIVACY_EMAIL` to a monitored mailbox so privacy and
  correction requests do not depend on the optional story-form integration.
- [ ] Misattribution/correction requests can be handled promptly.
- [ ] Decide and implement a report-retention period for the Google Sheet.
  The current app does not automatically purge report rows.
- [ ] Assess whether a Data Protection Impact Assessment (DPIA) is appropriate
  before public scale. The Swiss FDPIC's guidance discusses DPIAs where
  processing may create a high risk, and GDPR Article 22 is relevant if a
  product ever moves toward legally significant automated decisions.

Reference:
- Swiss FDPIC: https://www.edoeb.admin.ch/
- GDPR / EUR-Lex: https://eur-lex.europa.eu/eli/reg/2016/679/oj

### 3. Report and contact delivery

- [ ] Apps Script report endpoint is reachable from the deployed Next.js server.
- [ ] Address direct-call abuse before public scale: the current Apps Script
  endpoint does not require authentication, so callers who know the URL can
  bypass the Next.js rate limiter unless Apps Script enforces its own
  validation/abuse controls.
- [ ] One report request creates exactly one row in the private Google Sheet.
- [ ] The requested report reaches the user.
- [ ] The owner copy arrives.
- [ ] The report body contains only the final filtered sources.
- [ ] If Share Your Story stays visible, configure Brevo + owner notification
  email and perform a real submission smoke test. Otherwise remove/hide that
  public entry point until configured.

### 4. Analytics and consent

- [ ] GA4/GTM do not load before explicit analytics consent.
- [ ] Rejecting analytics leaves the site fully functional.
- [ ] Search names, candidate identities, claims, report text, source URLs,
  story content, and delivery emails never enter analytics events.
- [ ] Verify in browser DevTools that analytics requests are absent before
  consent and present only after consent.
- [ ] Confirm GTM is not duplicating GA4 page views/events if both are configured.

### 5. SEO / crawl controls

Staging:

```text
NEXT_PUBLIC_SITE_URL=https://YOUR-STAGING-DOMAIN
NEXT_PUBLIC_ALLOW_INDEXING=false
```

Production only after all blockers pass:

```text
NEXT_PUBLIC_SITE_URL=https://YOUR-CANONICAL-DOMAIN
NEXT_PUBLIC_ALLOW_INDEXING=true
```

Then verify:

- [ ] `/robots.txt` allows the public site, blocks `/api/`, and advertises
  `/sitemap.xml`.
- [ ] `/sitemap.xml` contains only canonical public pages.
- [ ] Every indexable page has a unique title, description, and canonical URL.
- [ ] Homepage includes valid `WebSite` structured data.
- [ ] Favicon matches the site logo.
- [ ] Google Search Console property is verified and sitemap submitted.
- [ ] No staging/preview URL is indexed.
- [ ] Run Google's Rich Results / URL Inspection tools after deployment.

Google Search guidance:
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/crawling-indexing
- https://developers.google.com/search/docs/appearance/site-names

### 6. Security and reliability

- [ ] `npm run check` passes.
- [ ] GitHub CI is green.
- [ ] Production dependency audit has no high-severity production findings.
- [ ] CSP, HSTS, X-Content-Type-Options, frame protection, and referrer policy
  are present in production responses.
- [ ] Search/report/story API responses use `no-store`.
- [ ] No request bodies containing searched names or reports are written to
  application logs.
- [ ] Rate limits are tested. Note that the current in-memory limiter is
  per-runtime-instance and is not a distributed abuse-prevention system.
- [ ] Error messages do not expose secrets, internal stack traces, or private
  configuration.

## SEO content strategy

The About page uses **The Tinder Swindler / Shimon Hayut** as the primary
high-recognition example, sourced to Netflix Tudum. The page is deliberately
written around the lesson of exact identity and independent source verification,
not around declaring a person "safe" or "dangerous."

Do not create thin SEO pages for individual people or automatically publish
search-result pages. Search names should remain transient user inputs, not
indexable site content.
