# Deploy Before You Trust — current dev setup

## Before deployment

```bash
npm ci
npm run deploy:preflight
npm run check
```

## Amplify `dev`

Set these non-secret values:

```text
NEXT_PUBLIC_SITE_URL=https://YOUR-DEV-URL
SEARCH_PROVIDER=yacy
YACY_BASE_URL=https://YOUR-YACY-HOST
YACY_RESOURCE=global
REPORT_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxe1s2hTRDF3m37UDcEHCj8Feb5iEDwjM82ZXizQ1sOgdZvJdNvkLbJsYi3FCJHA7Ml/exec
```

For report delivery, the server also needs:

```text
REPORT_APPS_SCRIPT_SECRET=<same value as Apps Script API_SECRET>
```

Store that in encrypted SSM rather than in public/build-time configuration:

```text
RUNTIME_SECRETS_PARAMETER=/before-you-trust/dev/runtime
```

The runtime JSON can initially be as small as:

```json
{
  "REPORT_APPS_SCRIPT_SECRET": "replace-with-the-private-secret"
}
```

If SSM is used, give the Amplify SSR Compute role `ssm:GetParameter` for only that parameter. DynamoDB is not used by the current search/report flow.

## Verify after deployment

1. Homepage loads.
2. YaCy search works.
3. Search without responsible-use confirmation is blocked.
4. A new search starts from clean state.
5. Multiple candidate identities remain separate.
6. Clicking **This is them** selects only the clicked candidate.
7. Deep results that cannot be tied strongly to that identity are excluded.
8. Sensitive results are not shown solely because a name matched.
9. Report email appends exactly one Google Sheet row.
10. Visitor receives the report.
11. Owner receives a copy.
12. No search/report body appears in logs or analytics.
13. Optional integrations fail gracefully when not configured.

See `MANUAL_SETUP.md` for the fuller setup.
