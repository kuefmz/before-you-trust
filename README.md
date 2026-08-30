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
- Deep searches across professional, official, news, claim, and concern-oriented query families
- Evidence-first Trust Brief with original source links
- No user accounts or application database
- No server-side report persistence
- Responsible-use confirmation and privacy/acceptable-use pages
- Security headers and no-store API responses
- Best-effort application rate limiting
- Unit, API, component, and Playwright end-to-end tests
- GitHub Actions quality gate
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

Never expose provider keys through `NEXT_PUBLIC_*`.

## Quality gates

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run test:e2e
```

Or run the non-browser checks together:

```bash
npm run check
```

## Deployment

The app targets AWS Amplify Hosting with Next.js 15.5.24 and Node.js 22. Add the provider key(s) as Amplify environment variables and connect the `dev` branch first.

## Important limitations

Before You Trust is a public-web research assistant, not a comprehensive background-check service. Search coverage can be incomplete or wrong. “Nothing found” does not mean a person is safe, and an allegation does not prove wrongdoing.

See [the documentation index](docs/00-INDEX.md) for product, safety, architecture, search-quality, and launch guidance.
