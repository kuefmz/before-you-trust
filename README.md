# Before You Trust

**Know what the internet already knows.**

Before You Trust is an evidence-first public-web research tool. It searches public sources, helps users separate likely identities from namesakes, and builds a sourced Trust Brief without assigning a simplistic “trust” or “danger” score.

> Active development is on the `dev` branch. `main` is reserved for reviewed, release-ready work.

## What is implemented

- Branded responsive landing/search experience
- Identity-first neutral search stage
- Self-hosted SearXNG for broad web discovery, with YaCy as an independent index/fallback
- No paid per-search API; YaCy `local` and `global` resource modes remain supported
- Search timeouts, bounded concurrency, result caps and URL normalization
- Explainable candidate identity matching
- Explicit **This is them** selection before deep research
- Deep-search reports anchored only to the selected candidate
- Conservative identity-quality filtering, especially for news/official/concern results
- Low-confidence wrong-person results excluded from the final Trust Brief
- Social-profile discovery through known handles/profile URLs
- Optional transient Google Cloud Vision Web Detection for photo-based matching
- Google Sheet + Apps Script report storage and Gmail delivery when the user explicitly requests email
- No DynamoDB/search-history persistence
- Search/report request bodies excluded from application logs and analytics
- Optional Brevo email only for the separate Share Your Story/contact flow
- GA4 tracking (G-MVDVBJJFQB) blocked until analytics consent; optional GTM remains supported
- Privacy Notice, Terms of Use, Acceptable Use and About pages
- Unit/API/component/Playwright tests and GitHub Actions quality gates

## Local setup

Requires Node.js 22 and the free local search stack.

Start SearXNG + YaCy together:

```bash
docker compose -f search-stack/docker-compose.yml up -d
```

SearXNG will be available at `http://localhost:8888` and YaCy at `http://localhost:8090`.

Then:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Default search configuration:

```text
SEARCH_PROVIDER=auto
SEARXNG_BASE_URL=http://localhost:8888
YACY_BASE_URL=http://localhost:8090
YACY_RESOURCE=global
```

For report-by-email testing, also set the same secret you configured as the Apps Script Script Property `API_SECRET`:

```text
REPORT_APPS_SCRIPT_SECRET=YOUR_PRIVATE_SECRET
```

The Apps Script endpoint is already configured in `.env.example` and in the server-side route.

## Persistent data model

Ordinary searches are transient and are not written to an application database.

Only when the user explicitly requests report delivery, the application sends the **final filtered report** and its request context to the private Google Sheet through Apps Script. The email copy naturally also exists in Gmail/the recipient mailbox.

Rejected low-confidence search results and uploaded photos are not intentionally stored in the report Sheet.

## Quality gates

```bash
npm run deploy:preflight
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run test:e2e
```

## Important limitations

Before You Trust is a public-web research assistant, not a comprehensive background-check service or consumer reporting agency. Search coverage can be incomplete or wrong. “Nothing found” does not mean a person is safe, and an allegation does not prove wrongdoing. Do not use it for employment, housing, credit, insurance or other regulated eligibility decisions.

See [MANUAL_SETUP.md](MANUAL_SETUP.md) and [the documentation index](docs/00-INDEX.md).
