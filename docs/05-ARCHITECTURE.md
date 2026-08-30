# Technical Architecture

## Principle
Keep the MVP as one repository and one deployment.

## Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- AWS Amplify
- Search provider: benchmark Tavily vs Brave Search
- Optional LLM later, only if necessary for source summarization/claim extraction

## High-level flow

```text
Browser
  |
  | POST search context
  v
/api/search  (server-side)
  |
  +--> query builder
  +--> search provider
  +--> normalize results
  +--> return sourced result objects
  |
  v
Browser
  +--> dedupe
  +--> candidate identities
  +--> user confirms identity
  +--> request deeper search
  +--> render Trust Brief
```

## Why not pure GitHub Pages?
The interface can be static, but search APIs generally require secret keys and public websites commonly block browser-origin scraping/CORS. A tiny serverless route avoids exposing secrets while keeping the application simple.

## No database initially
Do not persist search subjects or reports in the MVP. Keep report state in the browser session. Add persistence only if a concrete feature requires it.

## Suggested project structure
```text
before-you-trust/
  app/
    page.tsx
    report/page.tsx
    privacy/page.tsx
    how-it-works/page.tsx
    api/search/route.ts
  components/
  lib/
    queries.ts
    normalize.ts
    identity.ts
    sources.ts
    statuses.ts
  types/
  public/
  docs/
```

## Runtime responsibilities

### Browser
- Search and candidate-selection UI
- Report rendering
- Client-side session state
- Duplicate/result grouping where practical
- User confirmation of the correct identity

### Serverless API
- Protect search-provider credentials
- Validate and normalize search input
- Build neutral query variants
- Call search providers
- Normalize responses into a provider-independent result shape
- Apply rate limiting and basic abuse controls

### Search providers
- Tavily and/or Brave Search during benchmarking
- Providers are replaceable behind a small adapter interface

## Architecture constraints
- No separate backend repository.
- No long-running server.
- No database in MVP.
- No authentication in MVP.
- No Docker required for normal development.
- No storage of searched names in analytics.
- No secret values exposed through `NEXT_PUBLIC_*`.

## Deployment model
A single AWS Amplify app builds the Next.js repository. Server components and API routes execute server-side; static UI is served through the same deployment. The dev branch can be connected to an Amplify preview environment while main remains production-ready only.
