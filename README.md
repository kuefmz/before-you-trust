# Before You Trust

**Tagline:** Know what the internet already knows.

Before You Trust is an evidence-first public-web research tool that helps people verify identity, claims, affiliations, and publicly available information before deciding how much trust to place in someone.

## Core promise
- Search broadly across public web sources.
- Separate likely identity matches from namesakes.
- Show original sources for every meaningful finding.
- Distinguish verified facts, corroborated claims, unverified claims, conflicts, allegations, and unknowns.
- Never label a person "safe", "dangerous", "good", or "bad".
- Do not store searches in the MVP.

## MVP
1. Enter a person's name and optional context.
2. Search the public web using a server-side search provider.
3. Cluster results into candidate identities.
4. Ask the user to confirm the correct person.
5. Produce a sourced Trust Brief.

## Recommended stack
- Next.js + TypeScript
- Tailwind CSS
- One serverless API route: `/api/search`
- AWS Amplify hosting
- Tavily and/or Brave Search API for search benchmarking
- No database, authentication, queues, Docker, or separate backend for MVP

## Documentation
See `/docs` for product, brand, UX, technical, privacy, safety, testing, and launch documentation.

## Branching
- `main`: reserved for stable/release-ready work.
- `dev`: active development and product specification.
