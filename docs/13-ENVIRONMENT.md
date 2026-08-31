# Environment & Deployment

## Local development

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Run YaCy separately.

Core local search configuration:

```text
SEARCH_PROVIDER=yacy
YACY_BASE_URL=http://localhost:8090
YACY_RESOURCE=global
```

For report-by-email testing, the Apps Script endpoint is:

```text
REPORT_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxe1s2hTRDF3m37UDcEHCj8Feb5iEDwjM82ZXizQ1sOgdZvJdNvkLbJsYi3FCJHA7Ml/exec
```

No shared report secret is required by the current Apps Script deployment.

## Persistent storage

Ordinary searches are transient. There is no DynamoDB search-history store.

When a visitor explicitly requests email delivery, the final filtered report/request context is sent to the private Google Sheet through Apps Script. Email copies then exist in the relevant mail systems as part of delivery.

## AWS Amplify

1. Deploy `dev` first.
2. Set `NEXT_PUBLIC_SITE_URL`.
3. Set safe non-secret values:
   ```text
   SEARCH_PROVIDER=yacy
   YACY_BASE_URL=https://YOUR-YACY-HOST
   YACY_RESOURCE=global
   REPORT_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxe1s2hTRDF3m37UDcEHCj8Feb5iEDwjM82ZXizQ1sOgdZvJdNvkLbJsYi3FCJHA7Ml/exec
   ```
4. Put any optional server-only secrets in an encrypted SSM SecureString.
5. Set only its parameter name as:
   ```text
   RUNTIME_SECRETS_PARAMETER=/before-you-trust/dev/runtime
   ```
6. If using SSM, grant the SSR Compute role `ssm:GetParameter` only for that parameter. No DynamoDB permission is required.

## Optional server secrets

Depending on enabled features:
- `YACY_USERNAME` / `YACY_PASSWORD`
- `GOOGLE_VISION_API_KEY`
- Brevo values for Share Your Story only

## Logging

Do not log request bodies. In particular, do not persist searched names, identity clues, reports, email addresses or source URLs in CloudWatch/application logs.

## Environment separation

- Local: local YaCy + local env.
- Dev: Amplify `dev` + development YaCy + dev SSM secret.
- Production: `main` + production YaCy + separate production secret.
