# Deploy Before You Trust

For the complete one-time AWS/GitHub/search/Google setup and the automatic `main` release workflow, use **`docs/15-PRODUCTION-DEPLOYMENT.md`**.

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
NEXT_PUBLIC_ALLOW_INDEXING=false
NEXT_PUBLIC_PRIVACY_EMAIL=YOUR-MONITORED-PRIVACY-EMAIL
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=YOUR-SEARCH-CONSOLE-TOKEN
SEARCH_PROVIDER=auto
SEARXNG_BASE_URL=https://YOUR-SEARXNG-HOST
YACY_BASE_URL=https://YOUR-YACY-HOST
YACY_RESOURCE=global
REPORT_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbwZ0drdWpB_b4VL4jnsp5t1adsxzZPcZaeWM5prbcSt3RaiGrIdzJLZ1lW7MH9GjUef/exec
```

The current report Apps Script endpoint does not require a shared secret.

If other server-only secrets are used, store them in encrypted SSM rather than in public/build-time configuration:

```text
RUNTIME_SECRETS_PARAMETER=/before-you-trust/dev/runtime
```

If SSM is used, give the Amplify SSR Compute role `ssm:GetParameter` for only that parameter. DynamoDB is not used by the current search/report flow.

## Production indexing

Keep preview/dev deployments out of search engines:

```text
NEXT_PUBLIC_ALLOW_INDEXING=false
```

Only on the canonical production domain, after the live retrieval benchmark and
final launch review pass, set:

```text
NEXT_PUBLIC_SITE_URL=https://YOUR-PRODUCTION-DOMAIN
NEXT_PUBLIC_ALLOW_INDEXING=true
```

The application then emits canonical URLs, an indexable sitemap, and a robots
policy that advertises that sitemap.

## Verify after deployment

1. Homepage loads.
2. SearXNG broad discovery works.
3. YaCy also contributes independently when it has matching results.
4. Search without responsible-use confirmation is blocked.
5. A new search starts from clean state.
6. Multiple candidate identities remain separate.
7. Clicking **This is them** selects only the clicked candidate.
8. Deep results that cannot be tied strongly to that identity are excluded.
9. Sensitive results are not shown solely because a name matched.
10. The live 28-name Netflix retrieval benchmark passes against the deployed search stack.
11. Report email appends exactly one Google Sheet row.
12. Visitor receives the report.
13. Owner receives a copy.
14. No search/report body appears in logs or analytics.
15. Optional integrations fail gracefully when not configured.

See `MANUAL_SETUP.md` for the fuller setup.
