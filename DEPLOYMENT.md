# Deploy Before You Trust — start here

The repository is prepared for an **AWS Amplify deployment of the `dev` branch**. Do not deploy `main` yet; `main` is intentionally release-only and currently does not contain the application.

## Before opening Amplify

Run locally if you want an extra verification:

```bash
npm ci
npm run deploy:preflight
npm run check
```

GitHub Actions runs the equivalent quality gates automatically on `dev`.

## First deployment

1. In AWS Amplify Hosting, create/connect an app from `kuefmz/before-you-trust`.
2. Select **`dev`** as the first deployed branch.
3. Amplify will use the committed `amplify.yml`, which pins Node.js 22, runs `npm ci`, builds Next.js, and publishes the `.next` SSR artifact.
4. After Amplify gives you the branch HTTPS URL, set:
   ```text
   NEXT_PUBLIC_SITE_URL=https://YOUR-DEV-AMPLIFY-URL
   ```
5. Create the encrypted SSM SecureString:
   ```text
   /before-you-trust/dev/runtime
   ```
6. Put the server-only runtime JSON described in `MANUAL_SETUP.md` inside that SecureString.
7. In normal Amplify environment variables, add only:
   ```text
   RUNTIME_SECRETS_PARAMETER=/before-you-trust/dev/runtime
   ```
   plus any safe `NEXT_PUBLIC_*` values you intentionally want to expose.
8. Attach the least-privilege Amplify SSR Compute role from `MANUAL_SETUP.md`.
9. Redeploy `dev` after the runtime configuration is attached.

## Minimum runtime JSON for the first real search test

At least one search provider must be configured:

```json
{
  "SEARCH_PROVIDER": "auto",
  "TAVILY_API_KEY": "your-real-key"
}
```

You can use `BRAVE_SEARCH_API_KEY` instead of, or in addition to, Tavily.

Email, photo matching, repeat-search monitoring, Buy Me a Coffee, and analytics can be added independently. The application is designed to fail those optional features gracefully when they are not configured.

## If you want the full MVP enabled immediately

Add the remaining server-only values from `MANUAL_SETUP.md` to the same encrypted SSM JSON:

- Brave/Tavily credentials
- optional Google Vision key
- Brevo transactional email configuration
- DynamoDB search-signal configuration
- HMAC fingerprint secret
- repeat-alert settings

Create the DynamoDB table and TTL before enabling `SEARCH_SIGNAL_TABLE`.

## Never put these in normal Amplify variables

Do not directly expose or persist these as ordinary Amplify environment variables:

- `TAVILY_API_KEY`
- `BRAVE_SEARCH_API_KEY`
- `GOOGLE_VISION_API_KEY`
- `BREVO_API_KEY`
- `SEARCH_FINGERPRINT_SECRET`

They belong inside the encrypted SSM SecureString.

## After the first deployment

Use the Amplify HTTPS URL and verify:

1. Homepage and legal/about pages load.
2. A search without the responsible-use checkbox is blocked.
3. A distinctive consenting test subject produces candidate identity matches.
4. Deep research does not start until you click **This is them**.
5. A single candidate still requires confirmation.
6. Source links open correctly.
7. If enabled, photo matching works.
8. If enabled, report email and Share Your Story deliver successfully.
9. No searched name appears in analytics or application logs.
10. Only after the dev deployment is verified should you prepare `main` for production.

For the full AWS/IAM/Brevo/DynamoDB instructions, use `MANUAL_SETUP.md`.
