# Fly.io migration (staged, NOT deployed)

Existing Kiss AI Fly apps: `kiss-ai` (frontend) and `kiss-ai-backend` (Python backend), both in `cdg`.
The original Kiss AI configurations are in `kuefmz/kiss_ai` branch `chore/docker-fly-deployment`.

## Architecture caveat
Before You Trust is a Next.js monolith: its `app/api/*` routes run inside the Next.js server.
This change stages a replacement of **only** `kiss-ai` with the complete Next.js server.
It does NOT replace `kiss-ai-backend`, provision SearXNG/YaCy, or migrate data.
The existing 256 MB Kiss AI VM setting was increased to 512 MB for Next.js, which may cost more.
Do not deploy until existing Kiss AI data/secrets and billing have been reviewed.

## Prerequisites
- Check `fly status -a kiss-ai`, `fly machine list -a kiss-ai`, `fly volumes list -a kiss-ai`, and `fly status -a kiss-ai-backend`.
- Verify where SearXNG and YaCy are hosted and whether they are reachable securely from Fly.
- Set runtime configuration: `SEARXNG_BASE_URL`, `YACY_BASE_URL`, and any authentication credentials with `fly secrets set -a kiss-ai ...`.
- Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_ALLOW_INDEXING` before building; NEXT_PUBLIC variables are inlined during `next build`, so runtime secrets alone do not set browser-side values.
- If using AWS SSM, ensure AWS credentials and access; otherwise use Fly secrets directly and leave `RUNTIME_SECRETS_PARAMETER` unset.
- Create a scoped Fly deploy token: `fly tokens create deploy -a kiss-ai`; store as GitHub Actions repository secret `FLY_API_TOKEN` in Before You Trust.

## Controlled release
The new GitHub Actions workflow is manual-only (`workflow_dispatch`) and targets the existing `kiss-ai` app.
Review and merge the PR before invoking it. Keep Amplify's existing production deployment enabled until verification is complete.
A manual local deploy from the repo root is `fly deploy --app kiss-ai --config fly.toml --remote-only`.

## Verify
Check homepage, all four `app/api` routes, live search across SearXNG/YaCy, email report delivery, logs, indexing policy and bills.
Do not delete `kiss-ai-backend` or its volumes until its data and current integrations have been inspected.
