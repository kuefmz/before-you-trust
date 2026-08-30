# Environment & Deployment

## Local development

Create `.env.local` from `.env.example` and add local-only server credentials there.

```bash
cp .env.example .env.local
npm ci
npm run dev
```

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
5. Create an encrypted SSM Parameter Store SecureString such as:
   ```text
   /before-you-trust/dev/runtime
   ```
6. Store server-only values such as Tavily/Brave, Google Vision, Brevo and the search-fingerprint secret inside that encrypted JSON parameter.
7. In normal Amplify environment variables, set only the non-secret parameter path:
   ```text
   RUNTIME_SECRETS_PARAMETER=/before-you-trust/dev/runtime
   ```
   plus safe `NEXT_PUBLIC_*` values.
8. Attach the least-privilege Amplify SSR Compute role documented in `MANUAL_SETUP.md`.
9. Validate the complete search flow on `dev`.
10. Prepare and connect `main` only when the dev deployment is release-ready.

**Do not put API keys or the HMAC secret directly into ordinary Amplify environment variables.**

See [DEPLOYMENT.md](../DEPLOYMENT.md) for the short deployment sequence and [MANUAL_SETUP.md](../MANUAL_SETUP.md) for the complete AWS/IAM/provider configuration.

## Production logging

Request bodies must not be logged. In particular, do not persist searched names, identity clues, story content, report bodies, email addresses or source URLs in CloudWatch unless there is a separately documented operational need and retention policy.

## Environment separation

- Local: developer machine, local-only credentials.
- Dev: Amplify `dev` branch with development provider credentials/quotas and `/before-you-trust/dev/runtime`.
- Production: `main` with separate production credentials/configuration and a separate SSM parameter.

Never reuse the development fingerprint secret or provider credentials in production unless you intentionally accept that coupling.
