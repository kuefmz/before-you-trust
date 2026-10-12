# Before You Trust: GitHub Pages + Fly.io

## DNS
Website: `beforeyoutrust.org` -> GitHub Pages. API: `api.beforeyoutrust.org` -> existing `kiss-ai-backend` Fly app. Hostpoint nameserver change must complete first.

## GitHub Pages
In repository Settings > Pages choose **GitHub Actions** and set the custom domain to `beforeyoutrust.org`. Merging this branch to main triggers `deploy-pages.yml` automatically. `scripts/build-pages.mjs` exports a static frontend and excludes server API routes. The public API origin is compiled into the frontend at build time.

## Fly
Two existing Fly apps are repurposed:
- `kiss-ai-backend`: Node/Next API service on port 3000, reachable at `api.beforeyoutrust.org`. Workflow `deploy-fly.yml`, token `FLY_API_TOKEN`.
- `kiss-ai`: private SearXNG service on port 8080, reachable inside the Fly private network at `http://kiss-ai.internal:8080`. Workflow `deploy-search-fly.yml`, token `FLY_SEARCH_API_TOKEN`.

Set app-scoped tokens as GitHub Actions secrets, using `fly tokens create deploy -a kiss-ai-backend` and `fly tokens create deploy -a kiss-ai`. Do not share token values.

**Warning:** Deploying replaces both existing Kiss AI applications. Back up anything needed first. SearXNG is the sole search provider in this low-resource configuration; YaCy is not deployed. The original search coverage/benchmark must be revalidated. The two Fly machines may incur charges; this architecture does not guarantee a free backend.

## Deployment order
1. Run CI on migration PR and confirm static export and tests pass.
2. Configure Pages settings and Fly secrets.
3. Deploy private search with manual GitHub Actions workflow; verify SearXNG from a Fly machine.
4. Deploy backend with manual workflow; verify API requests and CORS from website origin.
5. Merge to main to publish GitHub Pages automatically. Disable AWS Amplify deployment separately when no longer required.
6. Confirm HTTPS and all four API flows. Check Fly bills.

**Not yet live or verified:** DNS, certificate, backend search reachability, production build, and end-to-end tests.
