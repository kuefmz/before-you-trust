# Before You Trust

**Know what the internet already knows.**

Before You Trust is an evidence-first public-web research tool. It searches public sources, helps users separate likely identities from namesakes, and builds a sourced Trust Brief without assigning a simplistic “trust” or “danger” score.

> Active development is on the `dev` branch. `main` is reserved for reviewed, release-ready work.

## What is implemented

- Branded responsive landing/search experience
- Identity-first neutral search stage
- Self-hosted YaCy search adapter with no per-search API key or quota
- YaCy `local` and `global` resource modes
- Optional Basic Auth for a protected YaCy node
- Search timeouts, concurrency limits, result caps, URL normalization and de-duplication
- Explainable candidate identity matching
- Social-media discovery across major public platforms and known handles/profile links
- Optional transient Google Cloud Vision Web Detection for photo-based public-web matching
- Required user identity confirmation before deep research
- Evidence-first Trust Brief with original source links
- Optional report-by-email delivery with explicit email-processing acknowledgement
- Professional About page with documented case studies and source links
- Private Share Your Story / feedback / privacy-request form delivered via Brevo
- Optional Buy Me a Coffee support link
- Privacy-preserving repeat-search detection using HMAC fingerprint + DynamoDB TTL
- Optional repeat-search email alerts without raw names by default
- Optional GTM/GA4 tracking that is blocked until analytics consent
- Search names and story content explicitly excluded from analytics events
- Full Privacy Notice, Terms of Use, and Acceptable Use policy
- Security headers and no-store API responses
- Unit, API, component, coverage and Playwright end-to-end tests
- GitHub Actions quality/security gate and weekly scheduled audit
- AWS Amplify deployment configuration with runtime SSM secret loading for optional sensitive integrations

## Local setup

Requires Node.js 22 and a running YaCy node.

Start YaCy with Docker:

```bash
docker run -d \
  --name yacy_search_server \
  -p 8090:8090 \
  -p 8443:8443 \
  -v yacy_search_server_data:/opt/yacy_search_server/DATA \
  --restart unless-stopped \
  yacy/yacy_search_server:latest
```

Then start Before You Trust:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

The defaults already point to:

```text
SEARCH_PROVIDER=yacy
YACY_BASE_URL=http://localhost:8090
YACY_RESOURCE=global
```

Use `YACY_RESOURCE=local` if you want queries restricted to your own YaCy index. `global` asks YaCy peers too and usually gives broader coverage.

No Tavily, Brave, Google Search API, or other paid search API key is required.

## Production search

Run YaCy on a host reachable by the Amplify SSR runtime and set:

```text
SEARCH_PROVIDER=yacy
YACY_BASE_URL=https://YOUR-YACY-HOST
YACY_RESOURCE=global
```

`YACY_BASE_URL` and `YACY_RESOURCE` are not secrets. If the YaCy search endpoint requires Basic Auth, keep `YACY_USERNAME` and `YACY_PASSWORD` server-side; the app supports them without any additional SDK.

## Manual production setup

**Start here:** [MANUAL_SETUP.md](MANUAL_SETUP.md)

It contains the exact checklist for:

- AWS Amplify + domain
- self-hosted YaCy
- optional Google Cloud Vision
- Brevo story/report email delivery
- DynamoDB repeat-search signals + TTL + IAM
- Buy Me a Coffee
- GTM + GA4 consent configuration
- Google Search Console + sitemap
- privacy/data-retention operations
- CloudWatch/budget/security checks

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run test:e2e
```

## Important limitations

Before You Trust is a public-web research assistant, not a comprehensive background-check service or consumer reporting agency. Search coverage can be incomplete or wrong. “Nothing found” does not mean a person is safe, and an allegation does not prove wrongdoing. Do not use it for employment, housing, credit, insurance or other regulated eligibility decisions.

See [the documentation index](docs/00-INDEX.md) for the broader product, safety, architecture, search-quality and launch guidance.
