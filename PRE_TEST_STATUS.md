# Before You Trust — Pre-test readiness

Last updated: 2026-08-31 (Europe/Zurich)

## Code and UX

- [x] Work is isolated on `dev`; `main` remains release-only.
- [x] Responsible-use acknowledgement is required.
- [x] Identity search happens before concern/deep research.
- [x] Multiple namesakes can be shown separately.
- [x] A single candidate still requires explicit confirmation.
- [x] The separate username field was removed; handles belong in Social profiles or handles.
- [x] A new search clears previous result/confirmation/report state.
- [x] **This is them** anchors the report only to the selected candidate.
- [x] Deep results are conservatively filtered against the confirmed identity.
- [x] Sensitive results without corroborating identity context are suppressed.
- [x] Excluded low-confidence results are not included in the final report.
- [x] Report storage path is Google Sheet + Apps Script.
- [x] DynamoDB repeat-search persistence has been removed.
- [x] Search names/report content are excluded from analytics events.
- [x] API responses are no-store/noindex.
- [x] Optional photo upload remains transient.

## External configuration

### YaCy

- [ ] Start a real YaCy node.
- [ ] Set `SEARCH_PROVIDER=yacy`.
- [ ] Set `YACY_BASE_URL`.
- [ ] Choose `YACY_RESOURCE=local` or `global` intentionally.

### Google Sheet / Apps Script

- [x] Private report Sheet created.
- [x] Report Sheet columns configured.
- [x] Owner email set to `jenifer.tabita.ciuciu.kiss@gmail.com`.
- [x] Apps Script web-app URL wired into the application.
- [ ] Apps Script has a long random Script Property named `API_SECRET`.
- [ ] Set the same value as server-side `REPORT_APPS_SCRIPT_SECRET`.
- [ ] Verify one test report appends exactly one row.
- [ ] Verify visitor and owner both receive email.

### Optional integrations

- [ ] Configure Google Vision only if photo matching is being tested.
- [ ] Configure Brevo only if Share Your Story is being tested.
- [ ] Configure GTM/GA4 only if analytics is desired.

## Gate for the first real end-to-end test

1. YaCy is reachable.
2. The Apps Script secret matches the server secret if email delivery is tested.
3. Use a consenting test subject; founder/self-test is appropriate.
4. Confirm candidate selection manually.
5. Review every included result for identity correctness.
6. Confirm the Google Sheet receives only the final requested report, not rejected search noise.
7. CI is green.
