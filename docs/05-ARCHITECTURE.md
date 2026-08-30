# Technical Architecture

## Principle
Keep the MVP as one repository and one deployment.

## Implemented stack
- Next.js 15.5.24 (App Router)
- React 19
- TypeScript
- CSS variables + plain CSS to minimize runtime/build dependencies
- AWS Amplify Hosting
- Tavily and Brave Search provider adapters
- Vitest + Testing Library + Playwright
- No database
- No authentication

> The original plan suggested Tailwind. The implementation intentionally uses plain CSS instead: the design does not require a utility framework, and removing that dependency reduces build/toolchain surface while keeping the codebase easier to deploy and audit.

## High-level flow

```text
Browser
  |
  | POST search context
  v
/api/search  (server-side)
  |
  +--> validation + rate limiting
  +--> neutral/deep query builder
  +--> provider adapter (Tavily -> Brave fallback)
  +--> timeout + concurrency control
  +--> normalize/dedupe/classify
  +--> sourced JSON response
  |
  v
Browser
  +--> explainable candidate identity matching
  +--> user confirms identity
  +--> deep search
  +--> evidence-first Trust Brief
```

## Privacy model
Report state is maintained in the active browser session. The application has no database of searched people. The API uses `Cache-Control: no-store` and the UI never puts a searched person's name in the URL.

## Runtime responsibilities

### Browser
- Search UI
- Candidate selection
- Explainable identity signals
- Session-only report state
- Trust Brief rendering

### Server-side route
- Keep provider API keys secret
- Validate request shape and size
- Enforce responsible-use acknowledgement
- Best-effort connection rate limiting
- Build bounded query sets
- Execute searches with concurrency and timeout limits
- Normalize and deduplicate public results
- Return source provenance

### Search providers
Search providers are replaceable adapters. `SEARCH_PROVIDER=auto` prefers Tavily when configured and falls back to Brave if a query fails.

## Architecture constraints
- No separate backend repository.
- No long-running server.
- No database in MVP.
- No user account system.
- No Docker required.
- No searched names in application analytics.
- No secret values exposed via `NEXT_PUBLIC_*`.

## Rate-limit note
The built-in rate limiter is a defensive best-effort control and is intentionally dependency-free. Because Amplify serverless compute can run multiple instances, production scale should add an infrastructure-level control such as AWS WAF/rate-based rules rather than treating in-memory state as a global quota.

## Deployment
A single Amplify app builds the Next.js repository. The `dev` branch should be connected first as the preview environment; `main` remains release-ready only.
