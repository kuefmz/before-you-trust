# Technical Architecture

## Principle
Keep the MVP as one repository and one application deployment, with a separately operated search node.

## Implemented stack
- Next.js 15.5.24 (App Router)
- React 19
- TypeScript
- CSS variables + plain CSS to minimize runtime/build dependencies
- AWS Amplify Hosting
- Self-hosted YaCy Search Server
- Vitest + Testing Library + Playwright
- No application database for searched people
- No authentication

> The implementation intentionally uses plain CSS instead of a utility framework because the design does not require one and removing that dependency reduces build/toolchain surface.

## High-level flow

```text
Browser
  |
  | POST search context
  v
/api/search  (server-side)
  |
  +--> validation + rate limiting
  +--> neutral/deep YaCy-compatible query builder
  +--> YaCy JSON search API
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

## Search node

The app calls `/yacysearch.json` on the configured `YACY_BASE_URL`.

- `YACY_RESOURCE=local` searches only the node's own index.
- `YACY_RESOURCE=global` also asks YaCy peers for results.
- The app requests at most six results per query.
- Optional HTTP Basic Auth is supported with `YACY_USERNAME` + `YACY_PASSWORD`.
- No third-party search API key or per-query billing is required.

The YaCy node is operational infrastructure, not a second application backend. Before You Trust still has one application repository and one application API surface.

## Privacy model
Report state is maintained in the active browser session. The application has no database of searched people. The API uses `Cache-Control: no-store` and the UI never puts a searched person's name in the URL.

When `YACY_RESOURCE=global`, the configured YaCy node can distribute search terms to peer nodes. Deployments using global mode must disclose that behavior accurately.

## Runtime responsibilities

### Browser
- Search UI
- Candidate selection
- Explainable identity signals
- Session-only report state
- Trust Brief rendering

### Server-side route
- Validate request shape and size
- Enforce responsible-use acknowledgement
- Best-effort connection rate limiting
- Build bounded YaCy-compatible query sets
- Execute searches with concurrency and timeout limits
- Normalize and deduplicate public results
- Return source provenance
- Keep optional YaCy credentials server-side

### YaCy
- Maintain/query the local search index
- Optionally participate in the peer-to-peer search network
- Return OpenSearch-style JSON results

## Architecture constraints
- No separate application backend repository.
- No paid search API dependency.
- No database of searched people in MVP.
- No user account system.
- Docker is optional locally but recommended for running YaCy.
- No searched names in application analytics.
- No secret values exposed via `NEXT_PUBLIC_*`.

## Rate-limit note
The built-in rate limiter is a defensive best-effort control and is intentionally dependency-free. Because Amplify serverless compute can run multiple instances, production scale should add an infrastructure-level control such as AWS WAF/rate-based rules rather than treating in-memory state as a global quota.

The YaCy endpoint itself should also be protected from direct abuse, especially if it is internet-accessible.

## Deployment
The Next.js application is deployed through Amplify. The YaCy node runs separately on infrastructure you control. The `dev` branch should be connected first as the preview environment; `main` remains release-ready only.
