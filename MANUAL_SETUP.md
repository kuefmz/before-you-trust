# Before You Trust — Manual Setup

This is the current operator setup for local/dev work. For the complete one-time production setup and automatic `main` deployment flow, see `docs/15-PRODUCTION-DEPLOYMENT.md`.

## 1. Local search stack

Start both free search services:

```bash
docker compose -f search-stack/docker-compose.yml up -d
```

Use:

```text
SEARCH_PROVIDER=auto
SEARXNG_BASE_URL=http://localhost:8888
YACY_BASE_URL=http://localhost:8090
YACY_RESOURCE=global
```

In `SEARCH_PROVIDER=auto`, every query is sent to both SearXNG and YaCy in parallel, then merged and deduplicated. The committed SearXNG settings enable JSON output for the application API. Use YaCy `local` instead of `global` if YaCy queries must stay within your own index.

## 2. Google Sheet + Apps Script report storage

The report workflow uses the private Google Sheet **Before You Trust - Reports**.

The configured Apps Script web-app endpoint is:

```text
https://script.google.com/macros/s/AKfycbzSiEe3FT7x3SY-vnMGHb1goDlB8SAqvleIxzvtMHYVXOdJFKSTo-UxkN2uFq0mWU8o/exec
```

The current Apps Script web app does not require a shared API secret. The Next.js server posts the validated report request directly to the configured web-app URL.

The non-secret URL can be overridden with:

```text
REPORT_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

### What the report Sheet stores

Only after the visitor explicitly requests email delivery, one row is appended with:
- timestamp/request id
- delivery email
- searched name and supplied context
- selected identity
- search-query metadata
- final filtered Trust Brief
- source URLs included in that final report
- email status/error

The app does not intentionally store rejected low-confidence results or uploaded photos in that Sheet.

### Email behavior

Apps Script sends:
- the report to the visitor
- a copy to the owner email in the Sheet `Settings` tab

The configured owner email is:

```text
jenifer.tabita.ciuciu.kiss@gmail.com
```

## 3. Production secret handling on Amplify

For production/dev deployment, create one encrypted SSM Parameter Store SecureString, for example:

```text
/before-you-trust/dev/runtime
```

If used, add optional server-only values such as:

```json
{
  "YACY_USERNAME": "optional",
  "YACY_PASSWORD": "optional",
  "GOOGLE_VISION_API_KEY": "optional",
  "BREVO_API_KEY": "optional-for-story-form",
  "BREVO_FROM_EMAIL": "optional-for-story-form",
  "BREVO_FROM_NAME": "Before You Trust",
  "OWNER_NOTIFICATION_EMAIL": "optional-for-story-form"
}
```

Then set this non-secret Amplify variable:

```text
RUNTIME_SECRETS_PARAMETER=/before-you-trust/dev/runtime
```

If SSM is used, the Amplify SSR Compute role needs only `ssm:GetParameter` for that parameter (plus `kms:Decrypt` only if you use a customer-managed KMS key). No DynamoDB permission is required.

## 4. Production search stack

Run SearXNG and YaCy on infrastructure reachable by the Amplify SSR runtime and configure:

```text
SEARCH_PROVIDER=auto
SEARXNG_BASE_URL=https://YOUR-SEARXNG-HOST
YACY_BASE_URL=https://YOUR-YACY-HOST
YACY_RESOURCE=global
REPORT_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbzSiEe3FT7x3SY-vnMGHb1goDlB8SAqvleIxzvtMHYVXOdJFKSTo-UxkN2uFq0mWU8o/exec
```

Protect the YaCy administration interface. If Basic Auth protects the search endpoint, keep `YACY_PASSWORD` server-side.

## 5. Optional photo matching

Photo matching uses Google Cloud Vision Web Detection and is optional.

If enabled, configure:

```text
GOOGLE_VISION_API_KEY=...
```

Photos are processed transiently and should not be written to the report Sheet or application storage.

## 6. Share Your Story

The separate Share Your Story/contact flow may still use Brevo transactional email. It is independent from report storage.

If you do not need that flow yet, Brevo can remain unconfigured.

## 7. Analytics

The project currently has production defaults for GA4 and GTM, but both remain
blocked until the visitor explicitly allows analytics.

```text
NEXT_PUBLIC_GA4_ID=G-MVDVBJJFQB
NEXT_PUBLIC_GTM_ID=GTM-TPGSP8XN
```

Never send searched names, report contents, source URLs, delivery emails or
candidate identities to analytics.

## 8. Live retrieval benchmark

With SearXNG, YaCy and the Next.js app running locally, test the real search
stack (not mocks) against the Netflix identity set:

```bash
npm run benchmark:live
```

You can append any additional exact-name benchmark, for example:

```bash
npm run benchmark:live -- "Another Exact Full Name"
```

This command fails if even one benchmark name has no exact-name result returned
by the live `/api/search` endpoint. Do not treat the search stack as
launch-ready until it passes.

## 9. SEO / indexing

Keep local and staging deployments non-indexable:

```text
NEXT_PUBLIC_SITE_URL=https://YOUR-STAGING-DOMAIN
NEXT_PUBLIC_ALLOW_INDEXING=false
```

Set a monitored privacy address:

```text
NEXT_PUBLIC_PRIVACY_EMAIL=privacy@example.com
```

On the canonical production domain, after live-search and launch-readiness checks
pass:

```text
NEXT_PUBLIC_SITE_URL=https://YOUR-PRODUCTION-DOMAIN
NEXT_PUBLIC_ALLOW_INDEXING=true
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=YOUR-SEARCH-CONSOLE-TOKEN
```

Then submit `/sitemap.xml` in Google Search Console.

## 10. Final smoke test

Before public use:

- [ ] SearXNG is reachable.
- [ ] YaCy is reachable.
- [ ] A fresh search clears all previous search state.
- [ ] Multiple namesakes remain separate.
- [ ] Clicking **This is them** selects only that candidate.
- [ ] Deep search begins only after confirmation.
- [ ] Wrong-person/low-confidence results are excluded from the final report.
- [ ] Sensitive findings require corroborating identity context.
- [ ] Report request appends one row to the private Google Sheet.
- [ ] Visitor receives the report email.
- [ ] Owner receives a copy.
- [ ] No ordinary search is persisted in DynamoDB or another app database.
- [ ] Request/report bodies are absent from logs and analytics.
- [ ] CI is green.
