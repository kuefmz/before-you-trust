# Before You Trust — Manual Production Setup

This is the operator checklist for the parts that **must not** be hard-coded into GitHub.

## 1. Deploy the `dev` branch to AWS Amplify

1. In AWS Amplify Hosting, connect `kuefmz/before-you-trust`.
2. Deploy `dev` as the preview/development environment first.
3. Confirm Amplify uses Node.js 22 (the repo also pins this in `amplify.yml`).
4. Set `NEXT_PUBLIC_SITE_URL` to the exact HTTPS URL for that environment.
5. Only connect `main` to the production domain after CI is green and the real-provider tests below pass.

## 2. Configure public-web search

Create at least one provider account:

- Tavily: set `TAVILY_API_KEY`
- Brave Search API: set `BRAVE_SEARCH_API_KEY`

Set:

```text
SEARCH_PROVIDER=auto
```

In `auto`, Tavily is attempted first when configured and Brave can act as fallback.

### Manual smoke test

Search:
- a distinctive consenting test subject,
- a common name with multiple namesakes,
- a public figure.

Confirm that:
- the identity stage contains no negative/accusatory query family,
- namesakes are kept separate,
- deep search starts only after confirmation,
- every finding has an original source URL.

## 3. Configure Brevo for Share Your Story + alerts

Brevo requires a registered/verified sender for transactional email.

Create a transactional API key and verified sender, then set:

```text
BREVO_API_KEY=...
BREVO_FROM_EMAIL=verified-sender@your-domain
BREVO_FROM_NAME=Before You Trust
OWNER_NOTIFICATION_EMAIL=your-private-inbox@example.com
REPEAT_ALERT_EMAIL_TO=your-private-inbox@example.com
```

The app sends **plain-text** story submissions to you. An optional visitor email is used as `Reply-To`; the visitor is not added to a marketing list.

Recommended Brevo/account settings:
- do not create newsletter contacts from story submissions,
- keep transactional open/click tracking off unless you have a specific documented reason,
- review transactional-log retention,
- use a dedicated sender/domain,
- enable account MFA.

Test the form from `/share-your-story` and verify both success/failure UI.

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

Set:

```text
SEARCH_SIGNAL_TABLE=before-you-trust-search-signals
SEARCH_FINGERPRINT_SECRET=<at least 32 random characters>
SEARCH_SIGNAL_TTL_DAYS=30
REPEAT_SEARCH_ALERT_THRESHOLD=3
REPEAT_ALERT_INCLUDE_NAME=false
AWS_REGION=eu-central-1
```

Generate a secret, for example:

```bash
openssl rand -base64 48
```

### IAM

The Amplify server runtime role needs only:

```json
{
  "Effect": "Allow",
  "Action": ["dynamodb:UpdateItem"],
  "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/before-you-trust-search-signals"
}
```

Do not grant table scans to the public app.

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

Allowed parameters are coarse product metrics such as result counts, candidate counts, confidence bucket and source type.

**Never add searched name, claim text, story text, email, profile URL or result URL to GA4.**

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
- sign/accept relevant DPAs with AWS, Brevo, search providers and Google where needed,
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
- AWS WAF/rate-based protection for `/api/search` and `/api/story` before meaningful public traffic (the in-app limiter is best-effort per server instance),
- AWS Budget alert at a very low threshold,
- CloudWatch error alarms for the Amplify/server runtime,
- DynamoDB cost anomaly/billing alert,
- Brevo MFA,
- GitHub branch protection on `main`,
- required CI status before merge to `main`,
- Dependabot or GitHub dependency alerts,
- periodic provider-key rotation.

Do not log request bodies in CloudWatch.

## 12. Final production smoke test

Before pointing the domain at production:

- [ ] CI green
- [ ] production dependency audit green
- [ ] `NEXT_PUBLIC_SITE_URL` correct
- [ ] search provider works
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
