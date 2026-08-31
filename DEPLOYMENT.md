# Deploy Before You Trust — start here

The repository is prepared for an **AWS Amplify deployment of the `dev` branch**. Do not deploy `main` yet; `main` is intentionally release-only.

## Before opening Amplify

Run locally if you want an extra verification:

```bash
npm ci
npm run deploy:preflight
npm run check
```

GitHub Actions runs the equivalent quality gates automatically on `dev`.

## First deployment

1. Run a YaCy node that the Amplify SSR runtime can reach over HTTP(S).
2. In AWS Amplify Hosting, create/connect an app from `kuefmz/before-you-trust`.
3. Select **`dev`** as the first deployed branch.
4. Amplify will use the committed `amplify.yml`, which pins Node.js 22, runs `npm ci`, builds Next.js, and publishes the `.next` SSR artifact.
5. Set:
   ```text
   NEXT_PUBLIC_SITE_URL=https://YOUR-DEV-AMPLIFY-URL
   SEARCH_PROVIDER=yacy
   YACY_BASE_URL=https://YOUR-YACY-HOST
   YACY_RESOURCE=global
   ```
6. If you use optional server secrets (YaCy Basic Auth, Google Vision, Brevo, or repeat-search monitoring), create the encrypted SSM SecureString:
   ```text
   /before-you-trust/dev/runtime
   ```
7. Put only sensitive runtime values described in `MANUAL_SETUP.md` inside that SecureString.
8. In normal Amplify environment variables, add only the non-secret SSM parameter path:
   ```text
   RUNTIME_SECRETS_PARAMETER=/before-you-trust/dev/runtime
   ```
   plus safe `NEXT_PUBLIC_*` and YaCy endpoint/mode values.
9. Attach the least-privilege Amplify SSR Compute role from `MANUAL_SETUP.md` if SSM/DynamoDB features are enabled.
10. Redeploy `dev`.

## Minimum configuration for the first real search test

No third-party search API key is required:

```text
SEARCH_PROVIDER=yacy
YACY_BASE_URL=https://YOUR-YACY-HOST
YACY_RESOURCE=global
```

For local testing, `YACY_BASE_URL` defaults to `http://localhost:8090`.

Use `YACY_RESOURCE=local` to search only your node's own index. Use `global` to ask YaCy peers as well. Because global mode distributes the search to peers, the Privacy Notice must accurately describe that deployment choice.

Email, photo matching, repeat-search monitoring, Buy Me a Coffee, and analytics can be added independently. The application is designed to fail optional features gracefully when they are not configured.

## If the YaCy endpoint requires authentication

The search adapter supports HTTP Basic Auth:

```text
YACY_USERNAME=...
YACY_PASSWORD=...
```

Treat the password as a server secret. For Amplify, keep it in the encrypted runtime JSON rather than in public/build-time variables.

## Never put these in normal Amplify variables

Do not directly expose or persist these as ordinary Amplify environment variables:

- `YACY_PASSWORD`
- `GOOGLE_VISION_API_KEY`
- `BREVO_API_KEY`
- `SEARCH_FINGERPRINT_SECRET`

They belong inside the encrypted SSM SecureString when used.

## After the first deployment

Use the Amplify HTTPS URL and verify:

1. Homepage and legal/about pages load.
2. A search without the responsible-use checkbox is blocked.
3. A distinctive consenting test subject produces candidate identity matches.
4. Deep research does not start until you click **This is them**.
5. A single candidate still requires confirmation.
6. Source links open correctly.
7. YaCy failures produce a controlled search error instead of crashing the app.
8. If enabled, photo matching works.
9. If enabled, report email and Share Your Story deliver successfully.
10. No searched name appears in analytics or application logs.
11. Only after the dev deployment is verified should you prepare `main` for production.

For the full AWS/IAM/Brevo/DynamoDB instructions, use `MANUAL_SETUP.md`.
