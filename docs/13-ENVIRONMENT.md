# Environment & Deployment

For the complete production setup and automatic `main` deployment workflow, see `15-PRODUCTION-DEPLOYMENT.md`.

## Local development

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Run the SearXNG + YaCy search stack separately.

Core local search configuration:

```text
SEARCH_PROVIDER=auto
SEARXNG_BASE_URL=http://localhost:8888
YACY_BASE_URL=http://localhost:8090
YACY_RESOURCE=global
```

For report-by-email testing, the Apps Script endpoint is:

```text
REPORT_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbzSiEe3FT7x3SY-vnMGHb1goDlB8SAqvleIxzvtMHYVXOdJFKSTo-UxkN2uFq0mWU8o/exec
```

No shared report secret is required by the current Apps Script deployment.

## Persistent storage

Ordinary searches are transient. There is no DynamoDB search-history store.

When a visitor explicitly requests email delivery, the final filtered report/request context is sent to the private Google Sheet through Apps Script. Email copies then exist in the relevant mail systems as part of delivery.

## AWS Amplify

1. Deploy `dev` first.
2. Set `NEXT_PUBLIC_SITE_URL`.
3. Keep `NEXT_PUBLIC_ALLOW_INDEXING=false` on dev/staging.
4. Set safe non-secret values:
   ```text
   SEARCH_PROVIDER=auto
   SEARXNG_BASE_URL=https://YOUR-SEARXNG-HOST
   YACY_BASE_URL=https://YOUR-YACY-HOST
   YACY_RESOURCE=global
   REPORT_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbzSiEe3FT7x3SY-vnMGHb1goDlB8SAqvleIxzvtMHYVXOdJFKSTo-UxkN2uFq0mWU8o/exec
   ```
5. Put any optional server-only secrets in an encrypted SSM SecureString.
6. Set only its parameter name as:
   ```text
   RUNTIME_SECRETS_PARAMETER=/before-you-trust/dev/runtime
   ```
7. If using SSM, grant the SSR Compute role `ssm:GetParameter` only for that parameter. No DynamoDB permission is required.

For the canonical production domain only, after launch checks pass:

```text
NEXT_PUBLIC_ALLOW_INDEXING=true
```

## Optional server secrets

Depending on enabled features:
- `YACY_USERNAME` / `YACY_PASSWORD`
- `GOOGLE_VISION_API_KEY`
- Brevo values for Share Your Story only

## Logging

Do not log request bodies. In particular, do not persist searched names, identity clues, reports, email addresses or source URLs in CloudWatch/application logs.

## Environment separation

- Local: local SearXNG + YaCy + local env.
- Dev: Amplify `dev` + development SearXNG/YaCy stack + optional dev SSM secrets.
- Production: `main` + production SearXNG/YaCy stack + separate optional production secrets. A successful `main` CI run triggers the AWS Amplify release workflow.
