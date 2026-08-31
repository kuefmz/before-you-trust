# Before You Trust — Production Deployment

This is the operator runbook for the production deployment.

The intended release flow is:

```text
work on dev
   ↓
push / PR
   ↓
CI
   ↓
merge or push reviewed commit to main
   ↓
CI runs on main
   ↓
only if CI succeeds
   ↓
Deploy production GitHub Action
   ↓
AWS Amplify RELEASE job for main
   ↓
production
```

The production workflow is:

```text
.github/workflows/deploy-main.yml
```

It does **not** deploy a failed main commit. It waits for the existing `CI`
workflow to complete successfully first.

---

## 0. What is automatic and what is one-time manual setup?

### Automatic after setup

After the one-time setup below, a push/merge to `main` does this automatically:

1. GitHub runs lint, type checking, unit/component tests, the Netflix
   exact-identity benchmark, dependency audit, production build and Playwright.
2. If CI fails, production is **not** deployed.
3. If CI passes, GitHub obtains short-lived AWS credentials through OIDC.
4. GitHub starts an AWS Amplify `RELEASE` job for the `main` branch.
5. The workflow waits for the Amplify job.
6. The GitHub deployment job is green only if Amplify reports `SUCCEED`.

No long-lived AWS access key is stored in GitHub.

### Still manual / external

These are intentionally separate from the application deployment:

- create/configure the Amplify app once;
- create the GitHub-to-AWS OIDC role once;
- set production Amplify environment variables;
- host SearXNG + YaCy on a production-reachable HTTPS machine;
- create/update the Google Sheet + Apps Script deployment;
- optionally configure Brevo/photo matching;
- connect the production domain;
- verify Search Console and finally enable indexing.

---

# 0.5 One-time repair: make `main` follow the real `dev` history

At the time this runbook was written, the repository's `main` branch contains
only an unrelated one-line initial README commit, while `dev` contains the
actual application. GitHub therefore reports **nothing to compare** because the
branches have no common ancestor.

Do this once before creating the production Amplify branch.

First make sure the latest deployment workflow is on `dev` and set the GitHub
Actions repository variable:

```text
PRODUCTION_DEPLOY_ENABLED=false
```

Then from a local clone:

```bash
git fetch origin

# Preserve the old one-line main commit just in case.
git branch main-before-production origin/main
git push origin main-before-production

# Make local main point to the reviewed dev history.
git checkout dev
git pull origin dev
git checkout -B main

# Replace the unrelated remote main with this real history.
git push --force-with-lease origin main
```

If GitHub blocks the force push because of a branch rule, temporarily allow
force pushes for `main`, perform the one-time command above, then immediately
disable force pushes again.

Afterward verify:

```bash
git fetch origin
git rev-parse origin/main
git rev-parse origin/dev
```

For the first sync they should be the same SHA. From that point onward, use
normal PRs/merges from `dev` to `main`; do not force-push `main` again.

# 1. Prepare AWS Amplify

If an Amplify app already exists for this repository, reuse it.

Otherwise:

1. Open **AWS Console → AWS Amplify**.
2. Choose **Create new app / Host web app**.
3. Connect **GitHub**.
4. Select:
   - repository: `kuefmz/before-you-trust`
   - branch: `main`
5. Let Amplify use the committed `amplify.yml`.
6. Use Node.js 22 as defined by the build configuration.
7. Finish creating the app.

The committed `amplify.yml` builds the Next.js SSR application and copies the
allowed non-secret runtime configuration into the production build.

## Important: avoid double deployments

The GitHub workflow is the production deployment trigger.

For the Amplify `main` branch, turn **automatic builds on Git push OFF** after
the branch is connected. Otherwise one push can cause:

1. an immediate native Amplify deployment, and
2. a second GitHub-gated deployment after CI.

We only want number 2.

In Amplify, open the `main` branch settings and disable automatic branch
builds / automatic deploys. The exact label in the console can change, but the
goal is: **keep the branch connected to GitHub, but do not deploy directly on a
Git push.**

## Find the Amplify App ID

Open the app in Amplify.

The App ID appears in the app details and is also part of Amplify URLs. It looks
similar to:

```text
d123exampleabc
```

Keep it for the GitHub variables below.

---

# 2. Create GitHub → AWS authentication with OIDC

Do **not** create an AWS access-key/secret-key pair for GitHub.

Use GitHub OIDC so every deployment receives temporary AWS credentials.

## 2.1 Create the GitHub OIDC provider in AWS

If your AWS account already has the GitHub provider, skip this subsection.

In AWS:

1. Open **IAM → Identity providers**.
2. Choose **Add provider**.
3. Provider type: **OpenID Connect**.
4. Provider URL:

   ```text
   https://token.actions.githubusercontent.com
   ```

5. Audience:

   ```text
   sts.amazonaws.com
   ```

6. Create the provider.

## 2.2 Create the deployment IAM role

Create an IAM role called, for example:

```text
BeforeYouTrustGitHubAmplifyDeploy
```

The role must only be assumable from this repository's `main` branch.

If you create the trust policy manually, replace `AWS_ACCOUNT_ID`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::AWS_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:kuefmz/before-you-trust:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

Attach a policy that permits only the Amplify operations used by the workflow:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "amplify:StartJob",
        "amplify:GetJob",
        "amplify:StopJob"
      ],
      "Resource": "*"
    }
  ]
}
```

The workflow itself always supplies the configured App ID and `main` branch.
If desired, tighten the resource scope further after the first successful
deployment.

Copy the role ARN. It looks like:

```text
arn:aws:iam::123456789012:role/BeforeYouTrustGitHubAmplifyDeploy
```

---

# 3. Configure GitHub Actions variables

Open:

**GitHub repository → Settings → Secrets and variables → Actions → Variables**

Create these **repository variables**:

### `PRODUCTION_DEPLOY_ENABLED`

Start with:

```text
false
```

Keep it `false` while you are fixing `main` and completing the one-time AWS
setup. After the first staging/production smoke tests pass, change it to:

```text
true
```

Only then can a successful `main` CI run trigger the production deployment.

### `AWS_REGION`

```text
eu-north-1
```

Use another region only if the Amplify app is in a different region.

### `AMPLIFY_APP_ID`

```text
YOUR_AMPLIFY_APP_ID
```

### `AWS_ROLE_TO_ASSUME`

Store this as a repository **Secret**:

```text
arn:aws:iam::AWS_ACCOUNT_ID:role/BeforeYouTrustGitHubAmplifyDeploy
```

Use repository **Variables** for `AWS_REGION`, `AMPLIFY_APP_ID`, and
`PRODUCTION_DEPLOY_ENABLED`. Use a repository **Secret** for
`AWS_ROLE_TO_ASSUME`.

No `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` should be added.

---

# 4. Configure the production Amplify environment

Open:

**Amplify → Before You Trust app → main branch → Environment variables**

Use the real production values.

## Required application variables

```text
NEXT_PUBLIC_SITE_URL=https://YOUR-CANONICAL-PRODUCTION-DOMAIN
NEXT_PUBLIC_ALLOW_INDEXING=false

NEXT_PUBLIC_PRIVACY_EMAIL=YOUR-MONITORED-PRIVACY-EMAIL

NEXT_PUBLIC_BUY_ME_A_COFFEE_URL=https://buymeacoffee.com/jenifertabitaciuciukiss

NEXT_PUBLIC_GA4_ID=G-MVDVBJJFQB
NEXT_PUBLIC_GTM_ID=GTM-TPGSP8XN

SEARCH_PROVIDER=auto

SEARXNG_BASE_URL=https://YOUR-SEARXNG-HOST
YACY_BASE_URL=https://YOUR-YACY-HOST
YACY_RESOURCE=global

REPORT_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbzSiEe3FT7x3SY-vnMGHb1goDlB8SAqvleIxzvtMHYVXOdJFKSTo-UxkN2uFq0mWU8o/exec
```

Initially keep:

```text
NEXT_PUBLIC_ALLOW_INDEXING=false
```

even on `main`.

Only change it to `true` after the production smoke tests and live retrieval
checks pass.

## Optional Search Console value

After verifying the production property:

```text
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=YOUR_GOOGLE_TOKEN
```

## Test-only values must stay false

Never enable these in production:

```text
E2E_MOCK_SEARCH=false
E2E_MOCK_EMAIL=false
E2E_MOCK_IMAGE_SEARCH=false
```

---

# 5. Production SearXNG + YaCy

Amplify cannot call:

```text
http://localhost:8888
http://localhost:8090
```

Those only work on your own computer.

For production, run the search containers on a separate machine with:

- a public IP;
- HTTPS DNS names;
- Docker;
- enough CPU/RAM for SearXNG + YaCy;
- outbound internet access.

A normal Linux VM is sufficient for the setup below.

## 5.1 DNS

Create two DNS names pointing at the VM, for example:

```text
search.YOUR-DOMAIN
yacy.YOUR-DOMAIN
```

## 5.2 Firewall / security group

Allow:

- TCP 22 only from your own IP, if SSH is needed;
- TCP 80 from the internet;
- TCP 443 from the internet.

Do **not** expose these publicly:

- 8090
- 8443
- 8888

The committed Docker Compose file binds those ports to `127.0.0.1` only.

## 5.3 Install software on the VM

Example on Ubuntu:

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin caddy
sudo usermod -aG docker "$USER"
```

Log out and back in after adding the Docker group if required.

Clone the repository:

```bash
git clone https://github.com/kuefmz/before-you-trust.git
cd before-you-trust
git checkout main
```

Create a SearXNG secret:

```bash
openssl rand -hex 32
```

Create:

```text
search-stack/.env
```

with:

```text
SEARXNG_SECRET=PASTE_THE_RANDOM_VALUE
```

Start the search services:

```bash
docker compose -f search-stack/docker-compose.yml up -d
```

Verify locally on the VM:

```bash
curl "http://127.0.0.1:8888/search?q=test&format=json"
curl "http://127.0.0.1:8090/yacysearch.json?query=test&resource=global&maximumRecords=1"
```

## 5.4 Protect the public search endpoints

Do not publish an unprotected SearXNG or YaCy endpoint.

The repository contains:

```text
search-stack/Caddyfile.example
```

Generate a strong password and Caddy hash:

```bash
openssl rand -base64 32
caddy hash-password --plaintext 'THE_PASSWORD'
```

Copy the example:

```bash
sudo cp search-stack/Caddyfile.example /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile
```

Replace:

- `search.example.com`;
- `yacy.example.com`;
- `REPLACE_WITH_CADDY_PASSWORD_HASH`.

Reload Caddy:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy obtains HTTPS certificates automatically after DNS points at the VM and
ports 80/443 are reachable.

Test from another machine:

```bash
curl -u beforeyoutrust:YOUR_PASSWORD   "https://search.YOUR-DOMAIN/search?q=test&format=json"

curl -u beforeyoutrust:YOUR_PASSWORD   "https://yacy.YOUR-DOMAIN/yacysearch.json?query=test&resource=global&maximumRecords=1"
```

## 5.5 Store search Basic Auth credentials server-side

Do not put passwords in `NEXT_PUBLIC_*` variables.

Create an encrypted **SSM Parameter Store SecureString**, for example:

```text
/before-you-trust/prod/runtime
```

Value:

```json
{
  "SEARXNG_USERNAME": "beforeyoutrust",
  "SEARXNG_PASSWORD": "YOUR_PASSWORD",
  "YACY_USERNAME": "beforeyoutrust",
  "YACY_PASSWORD": "YOUR_PASSWORD"
}
```

Then set this non-secret Amplify environment variable:

```text
RUNTIME_SECRETS_PARAMETER=/before-you-trust/prod/runtime
```

The Amplify SSR compute role must have:

```text
ssm:GetParameter
```

for that parameter, and `kms:Decrypt` only if you use a customer-managed KMS
key.

The app's `SEARCH_PROVIDER=auto` mode now queries **both SearXNG and YaCy for
every query**, in parallel, then merges and deduplicates their results.

---

# 6. Google Sheet + report email

The application stores a report only when the visitor explicitly asks for email
delivery.

## 6.1 Sheet

Use the private spreadsheet:

```text
Before You Trust - Reports
```

Create a tab called:

```text
Reports
```

with these columns in row 1:

```text
created_at_utc
request_id
user_email
searched_name
location
company
profile_url
social_profiles_json
claim
context
confirmed_identity_json
search_queries_json
report_text
source_urls_json
email_status
error_message
```

Create a second tab:

```text
Settings
```

with:

```text
setting | value | notes
```

At minimum add:

```text
OWNER_EMAIL | YOUR_OWNER_EMAIL | Receives a copy of each report
SHEET_NAME  | Reports          | Append one row per emailed report
```

## 6.2 Apps Script

Open the Sheet and choose:

**Extensions → Apps Script**

The repository contains the canonical script at:

```text
google-apps-script/Code.gs
```

Copy that file into Apps Script and save it.

The current version:

- has no obsolete `API_SECRET` check;
- appends one row;
- stores status/error;
- sends the completed Trust Brief directly without duplicating its heading;
- sends one copy to the visitor;
- sends one copy to the owner;
- prevents user-controlled Sheet values from becoming spreadsheet formulas.

## 6.3 Deploy Apps Script

Choose:

**Deploy → New deployment → Web app**

Set:

```text
Execute as: Me
Who has access: Anyone
```

Deploy.

Copy the URL ending in:

```text
/exec
```

Set that exact value in Amplify:

```text
REPORT_APPS_SCRIPT_URL=THE_EXEC_URL
```

When editing the Apps Script later:

1. Save the code.
2. **Deploy → Manage deployments**.
3. Click the pencil.
4. Version → **New version**.
5. Deploy.

Editing code does not automatically update an existing versioned web-app
deployment.

## 6.4 Test report delivery

Locally:

```bash
npm run smoke:report-email -- YOUR_TEST_EMAIL
```

Against deployed production/staging:

```bash
APP_BASE_URL=https://YOUR-SITE npm run smoke:report-email -- YOUR_TEST_EMAIL
```

Expected:

```text
HTTP 200
{
  "ok": true
}
```

Then verify:

- exactly one row was added to `Reports`;
- `email_status` becomes `sent`;
- visitor received the email;
- owner received the copy;
- the email heading/disclaimer is not duplicated.

---

# 7. Optional Share Your Story email

The report-email flow does **not** use Brevo.

The separate Share Your Story form can use Brevo.

If you keep that feature public, add these values to the encrypted SSM JSON:

```json
{
  "BREVO_API_KEY": "...",
  "BREVO_FROM_EMAIL": "...",
  "BREVO_FROM_NAME": "Before You Trust",
  "OWNER_NOTIFICATION_EMAIL": "..."
}
```

If you do not configure the feature, smoke-test that the UI fails gracefully or
remove/hide the public entry point before launch.

---

# 8. Optional photo matching

Photo matching is optional.

If enabled, add to the encrypted SSM JSON:

```json
{
  "GOOGLE_VISION_API_KEY": "..."
}
```

Uploaded photos are intended for transient matching and should not be written to
the report Sheet.

---

# 9. GA4 + GTM

Production defaults are currently:

```text
NEXT_PUBLIC_GA4_ID=G-MVDVBJJFQB
NEXT_PUBLIC_GTM_ID=GTM-TPGSP8XN
```

Both are consent-gated.

Before launch, test in browser DevTools:

1. Open a fresh/incognito browser.
2. Load the site.
3. Before accepting analytics, confirm no GA4/GTM analytics requests are sent.
4. Choose **Allow analytics**.
5. Confirm analytics begins only after consent.
6. Confirm searched names, report contents, candidate identities, emails and
   source URLs are not analytics payloads.
7. Check GTM is not duplicating events already emitted by direct GA4.

---

# 10. Custom domain

In Amplify:

1. Open **Domain management**.
2. Add your production domain.
3. Follow the DNS records Amplify provides.
4. Wait until the SSL certificate is issued.
5. Set:

   ```text
   NEXT_PUBLIC_SITE_URL=https://YOUR-CANONICAL-PRODUCTION-DOMAIN
   ```

Keep:

```text
NEXT_PUBLIC_ALLOW_INDEXING=false
```

until production verification is complete.

---

# 11. Google Search Console

After the canonical HTTPS domain is live:

1. Add the domain/URL-prefix property in Google Search Console.
2. Complete verification.
3. If Google gives a meta verification token, set:

   ```text
   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=TOKEN
   ```

4. Redeploy.
5. Verify:

   ```text
   https://YOUR-DOMAIN/robots.txt
   https://YOUR-DOMAIN/sitemap.xml
   ```

6. Keep indexing disabled until the next section passes.

---

# 12. Pre-indexing production verification

## 12.1 CI

The `main` CI run must be green.

## 12.2 Live retrieval benchmark

Run against the deployed app:

```bash
APP_BASE_URL=https://YOUR-DOMAIN npm run benchmark:live
```

Do not confuse the synthetic identity benchmark with live retrieval. The live
benchmark actually exercises the deployed SearXNG/YaCy path.

## 12.3 One-person debugging

During debugging, avoid repeatedly hammering the whole search stack. Run an
individual search in the UI and inspect **Search-provider notes**.

## 12.4 Report delivery

Run:

```bash
APP_BASE_URL=https://YOUR-DOMAIN npm run smoke:report-email -- YOUR_TEST_EMAIL
```

## 12.5 Manual lifecycle

Verify:

1. Search starts cleanly.
2. Exact full-name matching rejects similar names.
3. Both SearXNG and YaCy can contribute.
4. Namesakes remain separate.
5. **This is them** selects only the clicked identity.
6. Deep research starts only after identity confirmation.
7. Wrong-person sensitive findings do not enter the Trust Brief.
8. No-result state does not imply safety.
9. No-result state highlights **Do it yourself**.
10. Report email works.
11. Start new search clears the previous state.
12. Privacy preferences work.
13. Mobile layout works.
14. Source code link opens the public GitHub repository.

Also follow:

```text
docs/14-LAUNCH-READINESS.md
```

---

# 13. Enable production indexing

Only after the checks above pass, change the Amplify production variable:

```text
NEXT_PUBLIC_ALLOW_INDEXING=true
```

Redeploy `main`.

Then verify:

```text
/robots.txt
/sitemap.xml
```

and submit the sitemap in Search Console.

---

# 14. Normal release process after setup

Once all one-time setup is complete:

1. Work on `dev`.
2. Push changes to `dev`.
3. Wait for CI.
4. Run the real retrieval check against the release candidate/search stack:
   ```bash
   APP_BASE_URL=https://YOUR-STAGING-OR-DEV-URL npm run benchmark:live
   ```
5. Do not push/merge the release to `main` if that live retrieval gate is
   failing.
6. Review the remaining launch checklist in `docs/14-LAUNCH-READINESS.md`.
7. Ensure `PRODUCTION_DEPLOY_ENABLED=true` only when you really want
   successful `main` pushes to deploy automatically.
8. Merge `dev` into `main` through a PR, or push the reviewed commit to
   `main`.
9. CI runs on `main`.
10. If CI fails: **no production deployment**.
11. If CI passes and `PRODUCTION_DEPLOY_ENABLED=true`: **Deploy production**
    starts automatically.
12. GitHub waits for Amplify.
13. Green deployment means Amplify reported `SUCCEED`.

To manually re-run the deployment without making a new commit:

1. Open **GitHub → Actions → Deploy production**.
2. Choose **Run workflow**.
3. Run it from `main`.

---

# 15. Recommended GitHub branch protection

For `main`, enable branch protection/rules so production cannot be changed
accidentally.

Recommended:

- require pull request before merging;
- require the `CI / quality` check;
- require branch to be up to date before merging;
- block force pushes;
- block branch deletion.

The deploy workflow is intentionally **not** the merge requirement: it runs
after the successful main push and represents the production release itself.

---

# 16. Troubleshooting the deployment workflow

## Missing GitHub variable

If the workflow says:

```text
GitHub Actions variable AMPLIFY_APP_ID is not configured
```

configure the three repository variables in section 3.

## OIDC / AssumeRole failure

Check:

- GitHub OIDC provider exists in AWS;
- role ARN is correct;
- trust policy contains exactly this repository;
- trust policy allows only `refs/heads/main`;
- audience is `sts.amazonaws.com`.

## Amplify StartJob access denied

Check the role policy includes:

```text
amplify:StartJob
amplify:GetJob
amplify:StopJob
```

## Duplicate Amplify builds

Turn off Amplify's native automatic branch build for `main`. GitHub Actions is
the production trigger.

## Amplify build succeeds but search fails

The web app deployed correctly, but the production search services are not
reachable/configured. Check:

```text
SEARCH_PROVIDER
SEARXNG_BASE_URL
YACY_BASE_URL
RUNTIME_SECRETS_PARAMETER
```

and test both protected HTTPS endpoints directly.

## Email returns 502

Run:

```bash
APP_BASE_URL=https://YOUR-SITE npm run smoke:report-email -- YOUR_TEST_EMAIL
```

Then inspect:

**Apps Script → Executions**

Also verify the Apps Script deployment was updated to a **New version** after
the latest code change.

---

# 17. Files that define production behavior

```text
.github/workflows/ci.yml
.github/workflows/deploy-main.yml
amplify.yml
.env.example

search-stack/docker-compose.yml
search-stack/searxng-settings.yml
search-stack/Caddyfile.example

google-apps-script/Code.gs

DEPLOYMENT.md
MANUAL_SETUP.md
docs/13-ENVIRONMENT.md
docs/14-LAUNCH-READINESS.md
docs/15-PRODUCTION-DEPLOYMENT.md
```
