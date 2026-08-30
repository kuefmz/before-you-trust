# Initial Product Decisions

1. **Architecture:** monolithic Next.js application on AWS Amplify.
2. **Framework:** Next.js 15.5.24 because Amplify currently supports Next.js through major version 15.
3. **Node runtime:** Node.js 22.
4. **Backend:** one server-side API route inside the same repository.
5. **Database:** none for MVP.
6. **Accounts:** none for MVP.
7. **Styling:** plain CSS + design tokens instead of Tailwind to reduce dependencies.
8. **Search privacy:** do not store searched names/reports server-side.
9. **Search providers:** Tavily and Brave adapters; auto mode can fall back between them.
10. **Identity:** user confirms the correct candidate before deep research.
11. **Evidence:** every meaningful finding links to its original source.
12. **Risk scoring:** no generalized person-level risk/trust score.
13. **Concern search:** concern-oriented terms run only in the deep stage, after identity confirmation.
14. **Monetization:** never charge simply to reveal whether anything useful was found.
15. **Brand:** calm, protective, evidence-first—not alarmist or voyeuristic.
16. **Primary tagline:** “Know what the internet already knows.”
17. **Branch strategy:** build on `dev`; reserve `main` for reviewed, release-ready work.
18. **Complexity rule:** do not introduce persistence, queues, separate services, or AI orchestration until a concrete requirement proves they are needed.
19. **Testing:** every release must pass lint, typecheck, unit/API/component coverage, production build, production dependency audit, and Playwright E2E.
20. **Rate limiting:** lightweight in-app limiting for MVP; add AWS WAF/rate-based rules before meaningful public scale.
