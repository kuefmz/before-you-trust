# Search Quality Test Plan

## Goal
Prove that Before You Trust finds useful public information better than the competitors that motivated the product.

## Test set
Use:
- project creator's own name
- consenting friends with different levels of public footprint
- public figures with well-documented identities
- common-name cases with multiple namesakes
- people with sparse public footprints

Do not benchmark unsuspecting private individuals for internal experimentation when consent can reasonably be obtained.

## Metrics
- Relevant-source recall
- Wrong-person rate
- Duplicate rate
- Source quality
- Correct candidate grouping
- Claim-verification accuracy
- Citation/source-link completeness
- Empty-result honesty

## Acceptance targets for MVP
- 0 fabricated sources.
- 100% of material findings link to an original source.
- No high-confidence identity candidate containing known contradictory identity signals.
- Better useful-source coverage than at least two benchmark competitors on the controlled test set.

## Benchmark protocol
1. Define a small controlled subject set.
2. Record expected public sources manually.
3. Run Before You Trust and competitor searches with equivalent input.
4. Label every returned source relevant / wrong person / duplicate / weak.
5. Compare coverage and wrong-person rate.
6. Fix search/identity logic before adding deeper analysis features.
