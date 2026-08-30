# Identity Matching

## Core rule
Never assume two pages with the same name are the same person.

## Matching signals
Positive signals:
- exact distinctive name
- same city/country
- same employer/organization
- same role
- same username
- same linked website
- same education
- same timeline
- cross-links between profiles

Negative signals:
- incompatible locations at the same time
- different profession with no bridge
- different age/generation
- conflicting middle names
- unrelated organization histories

## Candidate confidence
Use explainable confidence buckets rather than an opaque "AI score":
- High confidence
- Medium confidence
- Low confidence

The UI should show the matching signals supporting the classification.

## User confirmation
Deep research should not begin until the user selects the likely correct identity, unless there is only one exceptionally clear candidate.

## Candidate object — suggested shape
```ts
type IdentityCandidate = {
  id: string;
  displayName: string;
  confidence: "high" | "medium" | "low";
  supportingSignals: string[];
  conflictingSignals: string[];
  sourceUrls: string[];
};
```

## Design principle
Identity resolution is a first-class product feature, not an invisible preprocessing step. Showing why results were grouped together is essential to trust and to preventing namesake mistakes.
