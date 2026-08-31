# Before You Trust — Manual Production Setup

This is the operator checklist for the parts that **must not** be hard-coded into GitHub.

## 1. Deploy the `dev` branch to AWS Amplify

1. In AWS Amplify Hosting, connect `kuefmz/before-you-trust`.
2. Deploy `dev` as the preview/development environment first.
3. Confirm Amplify uses Node.js 22 (the repo also pins this in `amplify.yml`).
4. Set `NEXT_PUBLIC_SITE_URL` to the exact HTTPS URL for that environment.
5. Set only public/non-secret values in normal Amplify environment variables.
6. Create the encrypted runtime configuration described in the next section and set only its **parameter name** as `RUNTIME_SECRETS_PARAMETER`.
7. Attach the least-privilege Amplify SSR Compute role described below.
8. Only connect `main` to the production domain after CI is green and the real YaCy search tests below pass.

## 1A. Production secrets: encrypted SSM + Amplify SSR Compute role

Do **not** put the YaCy password, Brevo API key, Google Vision key, or HMAC fingerprint secret into ordinary Amplify environment variables. AWS explicitly recommends that credentials/secrets are not stored there.

Create one AWS Systems Manager Parameter Store **SecureString**, for example:

```text
/before-you-trust/dev/runtime
```

Its value should be a JSON object:

```json
{
  "YACY_USERNAME": "replace-me-or-remove",
  "YACY_PASSWORD": "replace-me-or-remove",
  "GOOGLE_VISION_API_KEY": "replace-me-or-remove",
  "BREVO_API_KEY": "replace-me",
  "BREVO_FROM_EMAIL": "verified-sender@your-domain",
  "BREVO_FROM_NAME": "Before You Trust",
  "OWNER_NOTIFICATION_EMAIL": "your-private-inbox@example.com",
  "REPEAT_ALERT_EMAIL_TO": "your-private-inbox@example.com",
  "REPORT_REQUEST_NOTIFICATION_EMAIL": "your-private-inbox@example.com",
  "SEARCH_SIGNAL_TABLE": "before-you-trust-search-signals",
  "SEARCH_FINGERPRINT_SECRET": "at-least-32-random-characters",
  "SEARCH_SIGNAL_TTL_DAYS": "30",
  "REPEAT_SEARCH_ALERT_THRESHOLD": "3",
  "REPEAT_ALERT_INCLUDE_NAME": "false"
}
```

Then add only this **non-secret path** to Amplify:

```text
RUNTIME_SECRETS_PARAMETER=/before-you-trust/dev/runtime
```

The repository's `amplify.yml` exposes that parameter *name* to the SSR runtime, but never writes the SecureString value into the build artifact.

### Amplify SSR Compute role

Create/attach an **SSR Compute role** to the Amplify branch. The app uses the AWS SDK default credential chain, so the role provides temporary credentials at runtime.

Minimum policy shape:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter"],
      "Resource": "arn:aws:ssm:REGION:ACCOUNT_ID:parameter/before-you-trust/dev/runtime"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/before-you-trust-search-signals"
    }
  ]
}
```

If you encrypt the SSM SecureString with a customer-managed KMS key, also grant the compute role only the required `kms:Decrypt` permission on that key.

For a public repository, attach the role only to the branches that need it rather than broadly to automatic preview branches.

## 2. Configure public-web search with YaCy

Before You Trust now uses a self-hosted **YaCy Search Server**. No Tavily, Brave, Google Search API, or other paid search API key is required.

### Local YaCy

The official Docker image can be started with:

```bash
docker run -d \
  --name yacy_search_server \
  -p 8090:8090 \
  -p 8443:8443 \
  -v yacy_search_server_data:/opt/yacy_search_server/DATA \
  --restart unless-stopped \
  yacy/yacy_search_server:latest
```

Then use:

```text
SEARCH_PROVIDER=yacy
YACY_BASE_URL=http://localhost:8090
YACY_RESOURCE=global
```

### Production YaCy

Run YaCy on a stable host reachable from the Amplify SSR runtime. Set these as normal, non-secret Amplify variables:

```text
SEARCH_PROVIDER=yacy
YACY_BASE_URL=https://YOUR-YACY-HOST
YACY_RESOURCE=global
```

The committed `amplify.yml` copies those non-secret values into the server build configuration.

- `YACY_RESOURCE=local`: query only the configured node's own index.
- `YACY_RESOURCE=global`: also ask YaCy peers for results. This generally broadens coverage, but the search terms can be distributed to peers and the Privacy Notice must describe that accurately.

YaCy's unauthenticated search API is sufficient for this app's bounded result count. If you protect the endpoint with Basic Auth, configure both:

```text
YACY_USERNAME=...
YACY_PASSWORD=...
```

Keep the password in the encrypted SSM runtime JSON. Do not expose the YaCy administration UI with default credentials; change the default admin password and preferably expose only the search endpoint through your reverse proxy/tunnel.

### Manual smoke test

Search:
- a distinctive consenting test subject,
- a common name with multiple namesakes,
- a public figure.

Confirm that:
- the identity stage contains no negative/accusatory query family,
- namesakes are kept separate,
- deep search starts only after confirmation,
- every finding has an original source URL,
- a stopped/unreachable YaCy node produces a controlled error.

## 2A. Configure optional photo web matching

The photo feature uses Google Cloud Vision **Web Detection**. It is optional;
normal name/social searching works without it.

1. Create or choose a Google Cloud project.
2. Enable the Cloud Vision API.
3. Create a server-side API key and restrict it to the Vision API.
4. Put `GOOGLE_VISION_API_KEY` in the encrypted SSM runtime JSON, not in a
   `NEXT_PUBLIC_*` variable.
5. Test with a non-sensitive image and confirm `/api/image-search` returns
   public matching pages.

The app accepts JPG, PNG and WebP files up to 5 MB. It sends the image
transiently to Vision and does not store it in an application database or S3.

## 3. Configure Brevo for Share Your Story + alerts

Brevo requires a registered/verified sender for transactional email.

Create a transactional API key and verified sender. For local development these values can live in `.env.local`; for Amplify production add them to the encrypted SSM JSON:

```text
BREVO_API_KEY
BREVO_FROM_EMAIL
BREVO_FROM_NAME
OWNER_NOTIFICATION_EMAIL
REPEAT_ALERT_EMAIL_TO
REPORT_REQUEST_NOTIFICATION_EMAIL
```

The app sends **plain-text** story submissions to you. An optional visitor email is used as `Reply-To`; the visitor is not added to a marketing list.

Recommended Brevo/account settings:
- do not create newsletter contacts from story submissions,
- keep transactional open/click tracking off unless you have a specific documented reason,
- review transactional-log retention,
- use a dedicated sender/domain,
- enable account MFA.

Test the form from `/share-your-story` and verify both success/failure UI.

### Report-by-email test

Generate a Trust Brief, request delivery to a test inbox, and verify:
- the visitor receives the report and source links,
- the operator receives only the delivery email + source count,
- the operator notification does not include the searched name/report body,
- the email is not added to a Brevo marketing contact list.

## 4. Configure Buy Me a Coffee

Create your public Buy Me a Coffee page, then add:

```text
NEXT_PUBLIC_BUY_ME_A_COFFEE_URL=https://www.buymeacoffee.com/YOUR_HANDLE
```

If this variable is absent, the donation link is hidden—there is no broken placeholder.

## 5. Create the repeat-search signal table (DynamoDB)

This feature intentionally **does not store raw searched names**.

Create a DynamoDB table:

- Table name: e.g. `before-you-trust-search-signals`
- Partition key: `subjectKey` (String)
- Billing: On-demand
- Encryption: AWS owned/default encryption is fine for MVP; customer-managed KMS is optional
- Point-in-time recovery: optional; consider leaving it **off** because this is short-lived telemetry
- TTL attribute: `expiresAt`

For local development, set these in `.env.local`. For production, put all except the AWS runtime region in the encrypted SSM JSON:

```text
SEARCH_SIGNAL_TABLE=before-you-trust-search-signals
SEARCH_FINGERPRINT_SECRET=<at least 32 random characters>
SEARCH_SIGNAL_TTL_DAYS=30
REPEAT_SEARCH_ALERT_THRESHOLD=3
REPEAT_ALERT_INCLUDE_NAME=false
```

The Amplify runtime supplies AWS credentials through the SSR Compute role; no AWS access-key pair is stored in the app.

Generate a secret, for example:

```bash
openssl rand -base64 48
```

### IAM

Use the single least-privilege SSR Compute role from section 1A. It needs `dynamodb:UpdateItem` on this table and `ssm:GetParameter` on the one runtime SecureString. Do not grant DynamoDB table scans to the public app.

### What is stored

Only:
- `subjectKey`: HMAC-SHA256 keyed fingerprint
- `count`
- `firstSeen`
- `lastSeen`
- `expiresAt`
- `dataVersion`

Not stored:
- raw name
- searcher IP
- city/company/username/profile URL
- Trust Brief
- result URLs

Alerts occur at the configured threshold and then exponentially (for example 3, 6, 12, 24), so a popular name does not flood your inbox.

### Raw-name alerts

Keep:

```text
REPEAT_ALERT_INCLUDE_NAME=false
```

If you change it to `true`, the raw name is placed into the alert email. That means it becomes personal data stored in your mailbox/Brevo logs and materially changes the privacy risk. The site notice already discloses that the option exists, but the recommended production setting is **false**.

## 6. Handle a request to delete a repeat-search signal

If someone gives you the exact searched name in a valid privacy request:

```bash
SEARCH_FINGERPRINT_SECRET='...' npm run fingerprint:name -- "Exact Name"
```

Copy the resulting key and delete that item from DynamoDB using the AWS Console or:

```bash
aws dynamodb delete-item \
  --table-name before-you-trust-search-signals \
  --key '{"subjectKey":{"S":"PASTE_KEY_HERE"}}'
```

Never paste the raw name into CloudWatch logs or a GitHub issue.

## 7. Google Tag Manager + GA4 (optional)

The site works without analytics. If you leave `NEXT_PUBLIC_GTM_ID` unset:
- no GTM script loads,
- no GA4 request is sent,
- no analytics-consent banner appears.

### Recommended setup

1. Create a GA4 property.
2. In GA4, disable Google Signals / ads-personalization features unless you later have a documented need.
3. Use the shortest practical data retention.
4. Do not configure User-ID.
5. Create a GTM Web container.
6. Set:
   ```text
   NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
   ```
7. Deploy.
8. The app uses a **basic-consent approach**:
   - analytics/ad storage default to denied locally,
   - GTM is not requested until “Allow analytics,”
   - ad storage, ad user data and ad personalization remain denied.
9. In GTM, create the GA4 Google tag.
10. Do not create variables that read search-form fields, page text, story content or source URLs.

### Events available in the dataLayer

The app can emit, only after consent:
- `search_started`
- `search_completed`
- `identity_confirmed`
- `trust_brief_viewed`
- `source_opened`
- `share_story_viewed`
- `story_submitted`
- `support_click`
- `report_email_requested`
- `report_email_sent`

Allowed parameters are coarse product metrics such as result counts, candidate counts, confidence bucket and source type.

**Never add searched name, claim text, story text, delivery email, profile URL or result URL to GA4.**

### Verify

Use Google Tag Assistant in a clean/incognito browser:

1. Before consent: no request to `googletagmanager.com` or `google-analytics.com`.
2. Reject analytics: still no Google analytics request.
3. Allow analytics: GTM loads and events appear.
4. Use “Analytics preferences” in the footer to revisit the choice.

Google’s consent-mode documentation makes the site owner responsible for obtaining and communicating consent; basic mode blocks Google tags until the user grants it.

## 8. Google Search Console

Prefer a **Domain property** so all HTTPS/host variants are covered.

1. Add the domain in Search Console.
2. Verify by DNS TXT record (preferred).
3. You can alternatively set:
   ```text
   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=...
   ```
4. Once the production domain is live, submit:
   ```text
   https://YOUR_DOMAIN/sitemap.xml
   ```
5. Inspect the homepage, About page and How it works page.
6. Do not index `/api/*` or session reports; `robots.ts` already blocks them.

## 9. Privacy / legal operational checklist

Before meaningful public scale:
- have a Swiss/EU privacy lawyer review Privacy, Terms and Acceptable Use,
- verify the actual vendors configured match the Privacy Notice,
- document the privacy role of your YaCy deployment/peer mode and sign/accept relevant DPAs with AWS, Brevo and Google where needed,
- document your GDPR/Swiss FADP roles and international-transfer safeguards,
- maintain a simple vendor/processing register,
- keep story emails only as long as needed (a practical default is to review/delete inactive submissions after 12 months),
- action privacy requests promptly,
- do not copy search names into analytics, tickets, GitHub issues or logs,
- periodically test that DynamoDB TTL is deleting expired signal records.

## 10. Cookie/analytics policy

The site does **not** need to show an analytics banner when GTM is not configured.

When GTM/GA4 is configured, the built-in preferences banner is intentionally conservative: Google tags are blocked until opt-in. This is preferable for a Switzerland/EU-facing service because analytics technologies can track behavior and Google itself requires consent choices to be collected and respected.

The banner is for optional analytics only; rejecting it does not block the essential search service.

## 11. Security and operations

Set up:
- AWS WAF/rate-based protection for `/api/search`, `/api/image-search`, `/api/report-email` and `/api/story` before meaningful public traffic (the in-app limiter is best-effort per server instance),
- AWS Budget alert at a very low threshold,
- CloudWatch error alarms for the Amplify/server runtime,
- DynamoDB cost anomaly/billing alert,
- Brevo MFA,
- GitHub branch protection on `main`,
- required CI status before merge to `main`,
- Dependabot or GitHub dependency alerts,
- periodic rotation of any YaCy Basic Auth, Brevo, Vision and other server credentials.

Do not log request bodies in CloudWatch.

## 12. Final production smoke test

Before pointing the domain at production:

- [ ] CI green
- [ ] production dependency audit green
- [ ] `NEXT_PUBLIC_SITE_URL` correct
- [ ] normal Amplify variables contain no API keys/secrets
- [ ] `RUNTIME_SECRETS_PARAMETER` points to the encrypted SSM JSON
- [ ] SSR Compute role has only SSM GetParameter + DynamoDB UpdateItem (and KMS decrypt only if needed)
- [ ] search provider works
- [ ] social-profile queries return expected results
- [ ] optional Google Vision photo matching works (if enabled)
- [ ] report-by-email arrives and operator notification omits the searched subject
- [ ] story email arrives
- [ ] story submission is not stored in a DB
- [ ] DynamoDB stores fingerprint only
- [ ] TTL enabled on `expiresAt`
- [ ] repeat alert arrives at threshold
- [ ] raw-name alert setting is false
- [ ] no Google request before analytics opt-in
- [ ] Search Console verified
- [ ] sitemap submitted
- [ ] Privacy/Terms/Acceptable Use reviewed
- [ ] external links work
- [ ] mobile search/story flows tested
