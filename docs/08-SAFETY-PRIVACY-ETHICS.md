# Safety, Privacy & Ethics

## Product principle
The product is a research assistant, not a judge.

## Data boundaries
MVP uses publicly accessible information and user-provided context. Do not obtain or expose private credentials, hacked/leaked datasets, private communications without authorization, or unlawfully acquired personal data.

## Sensitive outputs
Avoid summarizing sensitive personal attributes unless directly relevant, lawfully public, and necessary to answer a legitimate user query. Do not infer sensitive traits from weak signals.

## Allegations
Always distinguish:
- allegation
- charge
- civil claim
- regulatory action
- conviction/adjudication
- dismissal/acquittal

Never collapse these into one "criminal" or "risk" label.

## Missing information
"No information found" means only that the system did not locate reliable public information. It must never be rendered as "safe", "verified", or "clean".

## Search privacy
For MVP:
- no database
- no stored search history on the server
- no analytics containing searched names
- redact query contents from application logs where technically possible
- document third-party search-provider processing honestly

## Abuse considerations
Design controls against stalking, harassment, doxxing, targeting minors, or collecting invasive personal details. A production launch should have a clear acceptable-use policy, reporting mechanism, and legal review for target markets.

## Product-output rules
- No generalized trust score.
- No generalized danger score.
- No unsupported accusation.
- No hidden-source conclusion.
- No implication that search coverage is complete.
- Every material finding must preserve provenance.

## Legal note
This document is product guidance, not legal advice. Before public launch, obtain legal review for privacy, defamation, data-protection, consumer-protection, and public-record rules in the jurisdictions where the service operates.
