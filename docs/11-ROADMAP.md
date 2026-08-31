# Roadmap

## Phase 0 — brand + research
- Finalize logo and visual identity.
- Benchmark YaCy local/global search quality on controlled names.
- Define legal/safety boundaries.

## Phase 1 — search proof of concept
- Build one search form.
- Implement `/api/search`.
- Generate neutral identity-discovery queries.
- Display raw sourced results.

## Phase 2 — identity resolution
- Cluster likely identities.
- Show matching signals.
- Add "Is this the person?" confirmation.

## Phase 3 — Trust Brief
- Deep search selected identity.
- Categorize sources.
- Build timeline.
- Verify claims.
- Show conflicts and uncertainty.

## Phase 4 — hardening
- Rate limiting.
- Query redaction in logs.
- Safety/abuse rules.
- Search quality telemetry without storing searched names.
- Privacy/legal review.

## Phase 5 — monetization experiment
Keep basic identity discovery free. If deeper reports create material third-party costs, test transparent paid depth rather than paywalling whether any result exists.

## Immediate implementation order
1. Scaffold Next.js + TypeScript + Tailwind.
2. Build branded landing/search screen.
3. Add the YaCy search adapter.
4. Benchmark local vs global YaCy coverage and tune the crawler/index.
5. Normalize and deduplicate results.
6. Add candidate identity cards.
7. Add user confirmation.
8. Add deep-search mode.
9. Render evidence-first Trust Brief.
10. Harden privacy, rate limits, logging, and abuse handling.
