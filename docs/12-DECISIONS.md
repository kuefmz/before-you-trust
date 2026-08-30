# Initial Product Decisions

1. **Architecture:** monolithic Next.js application on AWS Amplify.
2. **Backend:** one or a few serverless API routes inside the same repository.
3. **Database:** none for MVP.
4. **Accounts:** none for MVP.
5. **Search privacy:** do not store searched names/reports server-side.
6. **Search providers:** benchmark Tavily and Brave before choosing one.
7. **Identity:** user confirms the correct candidate before deep research.
8. **Evidence:** every meaningful finding must link to its source.
9. **Risk scoring:** no generalized person-level risk/trust score.
10. **Monetization:** never charge simply to reveal whether anything useful was found.
11. **Brand:** calm, protective, evidence-first—not alarmist or voyeuristic.
12. **Primary tagline:** “Know what the internet already knows.”
13. **Branch strategy:** build on `dev`; reserve `main` for reviewed, release-ready work.
14. **Complexity rule:** do not introduce persistence, queues, separate services, or AI orchestration until a concrete MVP requirement proves they are needed.
