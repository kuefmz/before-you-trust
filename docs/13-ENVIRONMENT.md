# Environment & Deployment

## Local development

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Run YaCy separately (Docker is the simplest local option). The default search configuration is:

```text
SEARCH_PROVIDER=yacy
YACY_BASE_URL=http://localhost:8090
YACY_RESOURCE=global
```

No search API key is required.

Never prefix server secrets with `NEXT_PUBLIC_`, and never commit `.env.local`.

## Deployment preflight

Before deployment:

```bash
npm run deploy:preflight
npm run check
```

The same deployment preflight is enforced by GitHub Actions.

## AWS Amplify deployment

1. Connect `kuefmz/before-you-trust` to AWS Amplify Hosting.
2. Deploy **`dev` first** as the development/preview environment.
3. Use the committed `amplify.yml`; it pins Node.js 22, installs with `npm ci`, builds Next.js and publishes the `.next` SSR artifact.
4. Set `NEXT_PUBLIC_SITE_URL` to the exact HTTPS URL of the deployed branch.
5. Run a YaCy node reachable from Amplify and set:
   ```text
   SEARCH_PROVIDER=yacy
   YACY_BASE_URL=https://YOUR-YACY-HOST
   YACY_RESOURCE=global
   ```
6. If optional sensitive integrations are enabled, create an encrypted SSM Parameter Store SecureString such as:
   ```text
   /before-you-trust/dev/runtime
   ```
7. Store server-only secrets such as `YACY_PASSWORD`, Google Vision, Brevo and the search-fingerprint secret inside that encrypted JSON parameter.
8. In normal Amplify environment variables, set only the non-secret parameter path:
   ```text
   RUNTIME_SECRETS_PARAMETER=/before-you-trust/dev/runtime
   ```
   plus safe `NEXT_PUBLIC_*` and YaCy endpoint/mode values.
9. Attach the least-privilege Amplify SSR Compute role documented in `MANUAL_SETUP.md` when SSM/DynamoDB features are enabled.
10. Validate the complete search flow on `dev`.
11. Prepare and connect `main` only when the dev deployment is release-ready.

**Do not put passwords, API keys, or the HMAC secret directly into ordinary public/build-time variables.**

## YaCy resource mode

- `local`: only the configured YaCy node is queried.
- `global`: YaCy also asks peers in the network for results.

Global mode can improve coverage but distributes search terms to peers. Choose the mode intentionally and keep the Privacy Notice aligned with the actual deployment.

See [DEPLOYMENT.md](../DEPLOYMENT.md) for the short deployment sequence and [MANUAL_SETUP.md](../MANUAL_SETUP.md) for the complete AWS/IAM/YaCy configuration.

## Production logging

Request bodies must not be logged. In particular, do not persist searched names, identity clues, story content, report bodies, email addresses or source URLs in CloudWatch unless there is a separately documented operational need and retention policy.

## Environment separation

- Local: developer machine + local YaCy.
- Dev: Amplify `dev` branch + development YaCy endpoint.
- Production: `main` + production YaCy endpoint and separate optional runtime secrets.

Do not reuse sensitive development credentials in production unless you intentionally accept that coupling.
