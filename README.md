# Before You Trust

**Know what the internet already knows.**

Before You Trust is an evidence-first public-web research tool. It searches public sources, helps users separate likely identities from namesakes, and builds a sourced Trust Brief without assigning a simplistic “trust” or “danger” score.

> Active development is on the `dev` branch. `main` is reserved for reviewed, release-ready work.

## What is implemented

- Branded responsive landing/search experience
- Identity-first neutral search stage
- Tavily and Brave Search provider adapters with automatic fallback
- Search timeouts, concurrency limits, result caps, URL normalization and de-duplication
- Explainable candidate identity matching
- Required user identity confirmation before deep research
- Evidence-first Trust Brief with original source links
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
- AWS Amplify deployment configuration

## Local setup

Requires Node.js 22.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Configure at least one search provider:

```bash
SEARCH_PROVIDER=auto
TAVILY_API_KEY=...
# and/or
BRAVE_SEARCH_API_KEY=...
```

Never expose private provider keys through `NEXT_PUBLIC_*`.

## Manual production setup

**Start here:** [MANUAL_SETUP.md](MANUAL_SETUP.md)

It contains the exact checklist for:

- AWS Amplify + domain
- Tavily/Brave
- Brevo story email delivery
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
