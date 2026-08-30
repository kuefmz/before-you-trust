# Product Brief

## Problem
Important information about a person may already exist publicly, but normal users often do not know where to search, how to distinguish namesakes, how to verify claims, or how to judge source quality. Existing people-search products frequently return poor matches, hide results behind paywalls, or provide opaque risk signals.

## Product goal
Make public-web due diligence understandable and accessible to ordinary people before they place meaningful trust in someone.

## Primary jobs to be done
- "I am considering dating this person; what public information should I know?"
- "I am considering doing business with this person; can I verify their claims?"
- "I am considering joining an organization led by this person; what is their public history?"
- "I met someone online; is the identity consistent across public sources?"
- "Someone claims a qualification, company, role, or history; can I corroborate it?"

## Non-goals for MVP
- Predicting whether someone will harm the user.
- Producing a numerical trust/risk score.
- Private-data brokerage.
- Facial recognition against private databases.
- Accessing hacked, leaked, paywalled, or unlawfully obtained data.
- Continuous monitoring of private individuals without an explicit, lawful product design.

## MVP user flow
1. Search form: full name + optional city/country/employer/username/profile URL.
2. Public-web search.
3. Candidate identity grouping.
4. User confirms the correct candidate.
5. Deeper sourced search runs for the selected identity.
6. Trust Brief is generated.
7. User can open every original source.

## Trust Brief sections
- Identity confidence
- Public footprint
- Professional / organizational affiliations
- Claims and corroboration
- Timeline
- News and public mentions
- Official / regulatory records where legally and technically available
- Conflicting information
- Unverified claims
- Source list
- Important limitations

## Success criteria
The MVP succeeds if it consistently finds relevant public sources for distinctive-name test subjects, avoids mixing namesakes, and lets a user understand why each finding appears in the report.
